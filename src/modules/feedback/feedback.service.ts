import { createHash, randomBytes, randomUUID } from "node:crypto";
import { AppError, CODES } from "@/shared/errors";
import { loadFeedbackConfig } from "./feedback.config";
import {
	KIND,
	MIME_BY_KIND,
	SIZE_CAP,
	STATUS,
	TIER,
	type Tier,
} from "./feedback.constants";
import type { CreateReport } from "./feedback.schemas";
import {
	createFeedbackStore,
	type FeedbackStore,
	type ReportRow,
} from "./feedback.store";
import { createNotifier, type ReportSummary } from "./notify/notifier";
import { createFeedbackQueue, type FeedbackQueue } from "./queue/queue";
import { createStorageSigner, type StorageSigner } from "./storage/signer";

const CLEANUP_INTERVAL_MS = 6 * 60 * 60 * 1000;

const genToken = (): string => randomBytes(32).toString("hex");
const hashToken = (token: string): string =>
	createHash("sha256").update(token).digest("hex");

const sizeCapFor = (kind: string, tier: Tier): number => {
	if (kind === KIND.LOGS) return SIZE_CAP.LOGS;
	if (kind === KIND.VIDEO) return SIZE_CAP.VIDEO;
	return tier === TIER.ATTESTED
		? SIZE_CAP.IMAGE_ATTESTED
		: SIZE_CAP.IMAGE_BASIC;
};

const validateAttachment = (
	a: { kind: string; mime: string; bytes: number },
	tier: Tier,
): void => {
	if (!MIME_BY_KIND[a.kind as keyof typeof MIME_BY_KIND]?.includes(a.mime)) {
		throw new AppError(
			`mime "${a.mime}" not allowed for kind "${a.kind}"`,
			400,
			CODES.MIME_MISMATCH,
		);
	}
	if (a.kind === KIND.VIDEO && tier !== TIER.ATTESTED) {
		throw new AppError(
			"video attachments require the attested tier",
			403,
			CODES.TIER_FORBIDS_VIDEO,
		);
	}
	if (a.bytes > sizeCapFor(a.kind, tier)) {
		throw new AppError(
			`${a.kind} attachment exceeds the size cap`,
			400,
			CODES.SIZE_EXCEEDED,
		);
	}
};

interface ServiceDeps {
	store: FeedbackStore;
	signer: StorageSigner;
	queue: FeedbackQueue;
}

export const createFeedbackService = ({
	store,
	signer,
	queue,
}: ServiceDeps) => {
	const presignAll = (
		attachments: { id: string; mime: string; s3_key: string }[],
	) =>
		attachments.map((a) => {
			const { url, headers } = signer.presignPut({
				key: a.s3_key,
				contentType: a.mime,
			});
			return { attachmentId: a.id, url, headers };
		});

	// Idempotent re-POST: refresh the token + URLs for a still-DRAFT report.
	// A report that is already SUBMITTED has no draft to reissue — reject it
	// rather than hand back a token whose hash was never stored.
	const reissueDraft = (existing: ReportRow, submitToken: string) => {
		if (existing.status === STATUS.SUBMITTED) {
			throw new AppError(
				"feedback report already submitted",
				409,
				CODES.ALREADY_SUBMITTED,
			);
		}
		store.updateSubmitTokenHash(existing.id, hashToken(submitToken));
		return {
			id: existing.id,
			submitToken,
			tier: existing.tier as Tier,
			uploads: presignAll(store.getAttachments(existing.id)),
		};
	};

	const createDraft = (body: CreateReport) => {
		if (!signer.isConfigured()) {
			throw new AppError(
				"feedback storage is not configured",
				503,
				CODES.FEEDBACK_UNCONFIGURED,
			);
		}

		const tier: Tier = TIER.BASIC; // MVP: attestation is phase 2
		const attachments = body.attachments ?? [];
		for (const a of attachments) validateAttachment(a, tier);

		const submitToken = genToken();

		const existing = store.findByClientKey(body.clientKey);
		if (existing) return reissueDraft(existing, submitToken);

		const id = randomUUID();
		const inserted = store.insertDraft({
			id,
			clientKey: body.clientKey,
			type: body.type,
			area: body.area ?? null,
			message: body.message ?? null,
			contact: body.contact?.value ?? null,
			app: JSON.stringify(body.app),
			tier,
			attested: 0,
			attestPlatform: null,
			submitTokenHash: hashToken(submitToken),
		});
		// Lost an insert race on the same clientKey → fall back to the existing row
		// instead of orphaning attachments against a non-persisted id.
		if (!inserted) {
			const raced = store.findByClientKey(body.clientKey);
			if (raced) return reissueDraft(raced, submitToken);
			throw new AppError(
				"feedback draft conflict",
				409,
				CODES.ALREADY_SUBMITTED,
			);
		}

		const attachmentRows = attachments.map((a) => {
			const attachmentId = randomUUID();
			return {
				id: attachmentId,
				kind: a.kind,
				mime: a.mime,
				sizeBytes: a.bytes,
				s3Key: signer.buildKey(id, attachmentId, a.mime),
			};
		});
		store.insertAttachments(id, attachmentRows);

		return {
			id,
			submitToken,
			tier,
			uploads: presignAll(
				attachmentRows.map((a) => ({
					id: a.id,
					mime: a.mime,
					s3_key: a.s3Key,
				})),
			),
		};
	};

	const submit = async (id: string, submitToken: string) => {
		const report = store.findById(id);
		if (!report) {
			throw new AppError(
				"feedback report not found",
				404,
				CODES.RESOURCE_NOT_FOUND,
			);
		}
		if (hashToken(submitToken) !== report.submit_token_hash) {
			throw new AppError(
				"invalid or consumed submit token",
				403,
				CODES.INVALID_SUBMIT_TOKEN,
			);
		}
		store.markSubmitted(id); // DRAFT→SUBMITTED (no-op if already submitted)
		// Enqueue while unnotified. Best-effort: the report is durably SUBMITTED,
		// so a failed enqueue is recovered by resweep() and PATCH still returns
		// 200. jobId=id dedupes duplicate enqueues into one job.
		if (report.notified === 0) {
			try {
				await queue.enqueueNotify(id);
			} catch (err) {
				console.error("[feedback] enqueue failed; resweep will retry:", err);
			}
		}
		return { status: STATUS.SUBMITTED };
	};

	return { createDraft, submit };
};

export type FeedbackServiceInstance = ReturnType<typeof createFeedbackService>;

const buildSummary = (
	report: ReportRow,
	store: FeedbackStore,
): ReportSummary => {
	const app = JSON.parse(report.app) as { version: string; platform: string };
	return {
		id: report.id,
		type: report.type,
		area: report.area,
		tier: report.tier,
		attested: report.attested === 1,
		appVersion: app.version,
		platform: app.platform,
		message: report.message,
		contact: report.contact,
		attachments: store.getAttachments(report.id).map((a) => ({
			kind: a.kind,
			sizeBytes: a.size_bytes,
			s3Key: a.s3_key,
		})),
	};
};

// Module singleton wired at boot, mirroring StatsService.init() call style.
let instance: FeedbackServiceInstance | null = null;
let storeRef: FeedbackStore | null = null;
let queueRef: FeedbackQueue | null = null;
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

export const FeedbackService = {
	init() {
		const cfg = loadFeedbackConfig();
		const store = createFeedbackStore();
		const signer = createStorageSigner(cfg.storage);
		const notifier = createNotifier(cfg.notifier);

		const processNotify = async (reportId: string) => {
			const report = store.findById(reportId);
			if (!report) return;
			await notifier.send(buildSummary(report, store));
			store.markNotified(reportId);
		};

		const queue = createFeedbackQueue({
			redisUrl: cfg.redisUrl,
			processNotify,
		});

		// Re-enqueue reports that are SUBMITTED but never notified (a previous
		// enqueue failed, or the process died before the worker ran). jobId
		// dedup makes this safe to run repeatedly.
		const resweep = async () => {
			for (const reportId of store.findUnnotifiedSubmitted()) {
				try {
					await queue.enqueueNotify(reportId);
				} catch (err) {
					console.error("[feedback] resweep enqueue failed:", err);
				}
			}
		};

		instance = createFeedbackService({ store, signer, queue });
		storeRef = store;
		queueRef = queue;

		store.cleanup();
		void resweep();
		cleanupTimer = setInterval(() => {
			store.cleanup();
			void resweep();
		}, CLEANUP_INTERVAL_MS);
	},

	async shutdown() {
		if (cleanupTimer) clearInterval(cleanupTimer);
		await queueRef?.shutdown();
		storeRef?.close();
		instance = null;
		storeRef = null;
		queueRef = null;
	},
};

export const getFeedbackService = (): FeedbackServiceInstance => {
	if (!instance) {
		throw new AppError(
			"feedback service is not initialized",
			503,
			CODES.FEEDBACK_UNCONFIGURED,
		);
	}
	return instance;
};
