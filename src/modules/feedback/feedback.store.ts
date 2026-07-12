import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";

export interface ReportRow {
	id: string;
	client_key: string;
	type: string;
	area: string | null;
	message: string | null;
	contact: string | null;
	app: string; // JSON
	status: string;
	tier: string;
	attested: number;
	attest_platform: string | null;
	submit_token_hash: string;
	created_at: number;
	submitted_at: number | null;
}

export interface AttachmentRow {
	id: string;
	report_id: string;
	kind: string;
	mime: string;
	size_bytes: number;
	s3_key: string;
	created_at: number;
}

export interface InsertDraftInput {
	id: string;
	clientKey: string;
	type: string;
	area: string | null;
	message: string | null;
	contact: string | null;
	app: string; // JSON string
	tier: string;
	attested: number;
	attestPlatform: string | null;
	submitTokenHash: string;
}

export interface InsertAttachmentInput {
	id: string;
	kind: string;
	mime: string;
	sizeBytes: number;
	s3Key: string;
}

const DRAFT_TTL_SECONDS = 24 * 60 * 60;
const CHALLENGE_TTL_SECONDS = 10 * 60;

export const createFeedbackStore = (dbPath = "data/feedback.db") => {
	mkdirSync("data", { recursive: true });
	const db = new Database(dbPath);
	db.run("PRAGMA journal_mode=WAL");
	db.run("PRAGMA foreign_keys=ON");

	db.run(`
		CREATE TABLE IF NOT EXISTS reports (
			id TEXT PRIMARY KEY,
			client_key TEXT NOT NULL UNIQUE,
			type TEXT NOT NULL,
			area TEXT,
			message TEXT,
			contact TEXT,
			app TEXT NOT NULL,
			status TEXT NOT NULL DEFAULT 'DRAFT',
			tier TEXT NOT NULL DEFAULT 'basic',
			attested INTEGER NOT NULL DEFAULT 0,
			attest_platform TEXT,
			submit_token_hash TEXT NOT NULL,
			created_at INTEGER NOT NULL DEFAULT (unixepoch()),
			submitted_at INTEGER
		)
	`);
	db.run(`
		CREATE TABLE IF NOT EXISTS attachments (
			id TEXT PRIMARY KEY,
			report_id TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
			kind TEXT NOT NULL,
			mime TEXT NOT NULL,
			size_bytes INTEGER NOT NULL,
			s3_key TEXT NOT NULL,
			created_at INTEGER NOT NULL DEFAULT (unixepoch())
		)
	`);
	db.run(`
		CREATE TABLE IF NOT EXISTS challenges (
			nonce TEXT PRIMARY KEY,
			created_at INTEGER NOT NULL DEFAULT (unixepoch()),
			consumed INTEGER NOT NULL DEFAULT 0
		)
	`);
	// client_key already has an implicit index via its UNIQUE constraint.
	db.run(
		"CREATE INDEX IF NOT EXISTS idx_reports_status_created ON reports(status, created_at)",
	);
	db.run(
		"CREATE INDEX IF NOT EXISTS idx_attachments_report ON attachments(report_id)",
	);

	const insertDraftStmt = db.prepare(`
		INSERT INTO reports (
			id, client_key, type, area, message, contact, app,
			tier, attested, attest_platform, submit_token_hash
		) VALUES (
			$id, $clientKey, $type, $area, $message, $contact, $app,
			$tier, $attested, $attestPlatform, $submitTokenHash
		)
		ON CONFLICT(client_key) DO NOTHING
	`);
	const findByClientKeyStmt = db.query<ReportRow, [string]>(
		"SELECT * FROM reports WHERE client_key = ?",
	);
	const findByIdStmt = db.query<ReportRow, [string]>(
		"SELECT * FROM reports WHERE id = ?",
	);
	const insertAttachmentStmt = db.prepare(`
		INSERT INTO attachments (id, report_id, kind, mime, size_bytes, s3_key)
		VALUES ($id, $reportId, $kind, $mime, $sizeBytes, $s3Key)
	`);
	const markSubmittedStmt = db.prepare(
		"UPDATE reports SET status = 'SUBMITTED', submitted_at = unixepoch() WHERE id = ? AND status = 'DRAFT'",
	);
	const updateSubmitTokenHashStmt = db.prepare(
		"UPDATE reports SET submit_token_hash = $hash WHERE id = $id AND status = 'DRAFT'",
	);
	const getAttachmentsStmt = db.query<AttachmentRow, [string]>(
		"SELECT * FROM attachments WHERE report_id = ? ORDER BY created_at",
	);
	const deleteDraftsStmt = db.prepare(
		"DELETE FROM reports WHERE status = 'DRAFT' AND created_at < ?",
	);
	const deleteChallengesStmt = db.prepare(
		"DELETE FROM challenges WHERE consumed = 1 OR created_at < ?",
	);

	const insertAttachmentsTxn = db.transaction(
		(reportId: string, rows: InsertAttachmentInput[]) => {
			for (const r of rows) {
				insertAttachmentStmt.run({
					$id: r.id,
					$reportId: reportId,
					$kind: r.kind,
					$mime: r.mime,
					$sizeBytes: r.sizeBytes,
					$s3Key: r.s3Key,
				});
			}
		},
	);

	return {
		insertDraft(input: InsertDraftInput): void {
			insertDraftStmt.run({
				$id: input.id,
				$clientKey: input.clientKey,
				$type: input.type,
				$area: input.area,
				$message: input.message,
				$contact: input.contact,
				$app: input.app,
				$tier: input.tier,
				$attested: input.attested,
				$attestPlatform: input.attestPlatform,
				$submitTokenHash: input.submitTokenHash,
			});
		},
		findByClientKey(clientKey: string): ReportRow | null {
			return findByClientKeyStmt.get(clientKey);
		},
		findById(id: string): ReportRow | null {
			return findByIdStmt.get(id);
		},
		insertAttachments(reportId: string, rows: InsertAttachmentInput[]): void {
			insertAttachmentsTxn(reportId, rows);
		},
		markSubmitted(id: string): boolean {
			return markSubmittedStmt.run(id).changes > 0;
		},
		updateSubmitTokenHash(id: string, hash: string): void {
			updateSubmitTokenHashStmt.run({ $id: id, $hash: hash });
		},
		getAttachments(reportId: string): AttachmentRow[] {
			return getAttachmentsStmt.all(reportId);
		},
		cleanup(): void {
			const nowSec = Math.floor(Date.now() / 1000);
			deleteDraftsStmt.run(nowSec - DRAFT_TTL_SECONDS);
			deleteChallengesStmt.run(nowSec - CHALLENGE_TTL_SECONDS);
		},
		close(): void {
			db.close();
		},
	};
};

export type FeedbackStore = ReturnType<typeof createFeedbackStore>;
