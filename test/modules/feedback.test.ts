import { beforeEach, describe, expect, test } from "bun:test";
import { createFeedbackService } from "@/modules/feedback/feedback.service";
import { createFeedbackStore } from "@/modules/feedback/feedback.store";
import type { FeedbackQueue } from "@/modules/feedback/queue/queue";
import type { StorageSigner } from "@/modules/feedback/storage/signer";
import { AppError, CODES } from "@/shared/errors";

const makeSigner = (configured = true): StorageSigner => ({
	isConfigured: () => configured,
	buildKey: (reportId, attachmentId, mime) =>
		`reports/${reportId}/${attachmentId}.${mime.split("/")[1]}`,
	presignPut: ({ key, contentType }) => ({
		url: `https://fake.example/${key}`,
		headers: { "Content-Type": contentType },
	}),
});

const makeQueue = () => {
	const enqueued: string[] = [];
	const queue: FeedbackQueue = {
		enqueueNotify: async (id) => {
			enqueued.push(id);
		},
		shutdown: async () => {},
	};
	return { queue, enqueued };
};

const makeService = (configured = true) => {
	const store = createFeedbackStore(":memory:");
	const signer = makeSigner(configured);
	const { queue, enqueued } = makeQueue();
	const service = createFeedbackService({ store, signer, queue });
	return { service, store, enqueued };
};

// biome-ignore lint/suspicious/noExplicitAny: test body overrides
const body = (over: Record<string, any> = {}) => ({
	type: "bug" as const,
	app: {
		version: "3.1.0",
		build: "3100",
		platform: "ios" as const,
		osVersion: "17.5",
	},
	clientKey: crypto.randomUUID(),
	...over,
});

const catchAppError = (fn: () => unknown): AppError => {
	try {
		fn();
	} catch (e) {
		if (e instanceof AppError) return e;
		throw e;
	}
	throw new Error("expected AppError, none thrown");
};

const catchAppErrorAsync = async (
	fn: () => Promise<unknown>,
): Promise<AppError> => {
	try {
		await fn();
	} catch (e) {
		if (e instanceof AppError) return e;
		throw e;
	}
	throw new Error("expected AppError, none thrown");
};

describe("feedback createDraft", () => {
	test("creates a draft with token and basic tier", () => {
		const { service } = makeService();
		const res = service.createDraft(body());
		expect(res.id).toBeString();
		expect(res.submitToken).toBeString();
		expect(res.tier).toBe("basic");
		expect(res.uploads).toBeArrayOfSize(0);
	});

	test("presigns one upload per attachment", () => {
		const { service } = makeService();
		const res = service.createDraft(
			body({
				attachments: [
					{ kind: "image", mime: "image/jpeg", bytes: 1024 },
					{ kind: "logs", mime: "text/plain", bytes: 512 },
				],
			}),
		);
		expect(res.uploads).toBeArrayOfSize(2);
		expect(res.uploads[0].url).toStartWith("https://fake.example/");
		expect(res.uploads[0].attachmentId).toBeString();
	});

	test("idempotent re-POST with same clientKey returns same id, fresh token", () => {
		const { service } = makeService();
		const b = body();
		const first = service.createDraft(b);
		const second = service.createDraft(b);
		expect(second.id).toBe(first.id);
		expect(second.submitToken).not.toBe(first.submitToken);
	});

	test("rejects video on the basic tier (403)", () => {
		const { service } = makeService();
		const err = catchAppError(() =>
			service.createDraft(
				body({
					attachments: [{ kind: "video", mime: "video/mp4", bytes: 1024 }],
				}),
			),
		);
		expect(err.statusCode).toBe(403);
		expect(err.code).toBe(CODES.TIER_FORBIDS_VIDEO);
	});

	test("rejects mime that does not match kind (400)", () => {
		const { service } = makeService();
		const err = catchAppError(() =>
			service.createDraft(
				body({
					attachments: [{ kind: "image", mime: "text/plain", bytes: 100 }],
				}),
			),
		);
		expect(err.statusCode).toBe(400);
		expect(err.code).toBe(CODES.MIME_MISMATCH);
	});

	test("rejects an oversized image on basic tier (400)", () => {
		const { service } = makeService();
		const err = catchAppError(() =>
			service.createDraft(
				body({
					attachments: [
						{ kind: "image", mime: "image/png", bytes: 6 * 1024 * 1024 },
					],
				}),
			),
		);
		expect(err.statusCode).toBe(400);
		expect(err.code).toBe(CODES.SIZE_EXCEEDED);
	});

	test("returns 503 when storage is unconfigured", () => {
		const { service } = makeService(false);
		const err = catchAppError(() => service.createDraft(body()));
		expect(err.statusCode).toBe(503);
		expect(err.code).toBe(CODES.FEEDBACK_UNCONFIGURED);
	});

	test("re-POST of an already-submitted clientKey returns 409, not a broken token", async () => {
		const { service } = makeService();
		const b = body();
		const created = service.createDraft(b);
		await service.submit(created.id, created.submitToken);
		const err = catchAppError(() => service.createDraft(b));
		expect(err.statusCode).toBe(409);
		expect(err.code).toBe(CODES.ALREADY_SUBMITTED);
	});
});

describe("feedback submit", () => {
	test("submits with a valid token and enqueues one notification", async () => {
		const { service, enqueued } = makeService();
		const created = service.createDraft(body());
		const res = await service.submit(created.id, created.submitToken);
		expect(res.status).toBe("SUBMITTED");
		expect(enqueued).toEqual([created.id]);
	});

	test("rejects an invalid submit token (403)", async () => {
		const { service } = makeService();
		const created = service.createDraft(body());
		const err = await catchAppErrorAsync(() =>
			service.submit(created.id, "wrong-token"),
		);
		expect(err.statusCode).toBe(403);
		expect(err.code).toBe(CODES.INVALID_SUBMIT_TOKEN);
	});

	test("re-submitting after notification does not enqueue again", async () => {
		const { service, store, enqueued } = makeService();
		const created = service.createDraft(body());
		await service.submit(created.id, created.submitToken);
		store.markNotified(created.id); // simulate the worker completing
		const res = await service.submit(created.id, created.submitToken);
		expect(res.status).toBe("SUBMITTED");
		expect(enqueued).toEqual([created.id]); // still just one
	});

	test("returns 404 for an unknown report id", async () => {
		const { service } = makeService();
		const err = await catchAppErrorAsync(() =>
			service.submit("does-not-exist", "token"),
		);
		expect(err.statusCode).toBe(404);
	});
});

describe("feedback store", () => {
	let store: ReturnType<typeof createFeedbackStore>;
	const draft = (id: string, clientKey: string) => ({
		id,
		clientKey,
		type: "bug",
		area: null,
		message: null,
		contact: null,
		app: "{}",
		tier: "basic",
		attested: 0,
		attestPlatform: null,
		submitTokenHash: "hash",
	});

	beforeEach(() => {
		store = createFeedbackStore(":memory:");
	});

	test("insertDraft returns false on a duplicate clientKey", () => {
		expect(store.insertDraft(draft("r1", "ck"))).toBe(true);
		expect(store.insertDraft(draft("r2", "ck"))).toBe(false);
		expect(store.findByClientKey("ck")?.id).toBe("r1");
	});

	test("markSubmitted transitions once", () => {
		store.insertDraft(draft("r1", "ck"));
		expect(store.markSubmitted("r1")).toBe(true);
		expect(store.markSubmitted("r1")).toBe(false);
	});

	test("findUnnotifiedSubmitted lists submitted-but-unnotified, cleared by markNotified", () => {
		store.insertDraft(draft("r1", "ck"));
		store.markSubmitted("r1");
		expect(store.findUnnotifiedSubmitted()).toEqual(["r1"]);
		store.markNotified("r1");
		expect(store.findUnnotifiedSubmitted()).toEqual([]);
	});
});
