import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { SQLITE_DB_PATH } from "@/config/db";

export interface StatEntry {
	endpoint: string;
	method: string;
	statusCode: number;
	responseTimeMs: number;
}

interface TotalsRow {
	total: number;
	errors: number;
	server_errors: number;
	avg_ms: number;
}

interface EndpointRow {
	endpoint: string;
	count: number;
	avg_ms: number;
	error_rate: number;
}

interface StatusCodeRow {
	status_code: number;
	count: number;
}

interface PercentileRow {
	response_time_ms: number;
}

interface EndpointPercentileRow {
	endpoint: string;
	p95_ms: number | null;
	p99_ms: number | null;
}

interface RecitationPlaysRow {
	recitation_id: string;
	plays: number;
}

interface MetaValueRow {
	value: number;
}

const FLUSH_INTERVAL_MS = 10_000;
const RETENTION_DAYS = 90;
const SWEEP_INTERVAL_MS = 3_600_000;

const PERIOD_HOURS = { "24h": 24, "7d": 168, "30d": 720 } as const;
export type Period = keyof typeof PERIOD_HOURS;

// biome-ignore lint/complexity/noStaticOnlyClass: project pattern
export abstract class StatsService {
	private static db: Database;
	private static buffer: StatEntry[] = [];
	private static playBuffer: string[] = [];
	private static insertStmt: ReturnType<Database["prepare"]>;
	private static insertPlayStmt: ReturnType<Database["prepare"]>;
	private static incrementRequestsStmt: ReturnType<Database["prepare"]>;
	private static incrementPlaysStmt: ReturnType<Database["prepare"]>;
	private static flushTimer: Timer;
	private static sweepTimer: Timer;
	private static initialized = false;

	static init(dbPath: string = SQLITE_DB_PATH) {
		if (!dbPath.startsWith(":")) {
			mkdirSync(dirname(dbPath), { recursive: true });
		}
		StatsService.db = new Database(dbPath);
		StatsService.db.run("PRAGMA journal_mode=WAL");
		StatsService.db.run(`
			CREATE TABLE IF NOT EXISTS request_stats (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				endpoint TEXT NOT NULL,
				method TEXT NOT NULL,
				status_code INTEGER NOT NULL,
				response_time_ms INTEGER NOT NULL,
				created_at INTEGER NOT NULL DEFAULT (unixepoch())
			)
		`);
		StatsService.db.run(
			"CREATE INDEX IF NOT EXISTS idx_stats_created_at ON request_stats(created_at)",
		);
		StatsService.db.run(
			"CREATE INDEX IF NOT EXISTS idx_stats_endpoint ON request_stats(endpoint)",
		);
		StatsService.db.run(`
			CREATE TABLE IF NOT EXISTS recitation_plays (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				recitation_id TEXT NOT NULL,
				created_at INTEGER NOT NULL DEFAULT (unixepoch())
			)
		`);
		StatsService.db.run(
			"CREATE INDEX IF NOT EXISTS idx_plays_recitation ON recitation_plays(recitation_id, created_at)",
		);
		StatsService.db.run(
			"CREATE TABLE IF NOT EXISTS stats_meta (key TEXT PRIMARY KEY, value INTEGER NOT NULL)",
		);
		StatsService.db.run(
			"INSERT OR IGNORE INTO stats_meta (key, value) VALUES ('total_requests', 0)",
		);
		StatsService.db.run(
			"INSERT OR IGNORE INTO stats_meta (key, value) VALUES ('total_plays', 0)",
		);

		StatsService.insertStmt = StatsService.db.prepare(
			"INSERT INTO request_stats (endpoint, method, status_code, response_time_ms) VALUES ($endpoint, $method, $statusCode, $responseTimeMs)",
		);
		StatsService.insertPlayStmt = StatsService.db.prepare(
			"INSERT INTO recitation_plays (recitation_id) VALUES ($id)",
		);
		StatsService.incrementRequestsStmt = StatsService.db.prepare(
			"UPDATE stats_meta SET value = value + $n WHERE key = 'total_requests'",
		);
		StatsService.incrementPlaysStmt = StatsService.db.prepare(
			"UPDATE stats_meta SET value = value + $n WHERE key = 'total_plays'",
		);

		StatsService.initialized = true;

		StatsService.flushTimer = setInterval(
			() => StatsService.flush(),
			FLUSH_INTERVAL_MS,
		);

		StatsService.sweep();
		StatsService.sweepTimer = setInterval(
			() => StatsService.sweep(),
			SWEEP_INTERVAL_MS,
		);
	}

	static record(entry: StatEntry) {
		StatsService.buffer.push(entry);
	}

	static recordPlay(recitationId: string): void {
		StatsService.playBuffer.push(recitationId);
	}

	static flush() {
		if (
			StatsService.buffer.length === 0 &&
			StatsService.playBuffer.length === 0
		) {
			return;
		}
		const entries = StatsService.buffer.splice(0);
		const plays = StatsService.playBuffer.splice(0);

		const run = StatsService.db.transaction(() => {
			for (const item of entries) {
				StatsService.insertStmt.run({
					$endpoint: item.endpoint,
					$method: item.method,
					$statusCode: item.statusCode,
					$responseTimeMs: item.responseTimeMs,
				});
			}
			for (const recitationId of plays) {
				StatsService.insertPlayStmt.run({ $id: recitationId });
			}
			if (entries.length > 0) {
				StatsService.incrementRequestsStmt.run({ $n: entries.length });
			}
			if (plays.length > 0) {
				StatsService.incrementPlaysStmt.run({ $n: plays.length });
			}
		});
		run();
	}

	private static sweep() {
		const cutoff = Math.floor(Date.now() / 1000) - RETENTION_DAYS * 86_400;
		StatsService.db.run("DELETE FROM request_stats WHERE created_at < ?", [
			cutoff,
		]);
		StatsService.db.run("DELETE FROM recitation_plays WHERE created_at < ?", [
			cutoff,
		]);
		StatsService.db.run("PRAGMA optimize");
	}

	static shutdown(): void {
		if (!StatsService.initialized) return;
		clearInterval(StatsService.flushTimer);
		clearInterval(StatsService.sweepTimer);
		StatsService.flush();
		StatsService.db.close();
		StatsService.initialized = false;
	}

	static getLifetimeRequests(): number {
		return (
			StatsService.db
				.query<MetaValueRow, []>(
					"SELECT value FROM stats_meta WHERE key = 'total_requests'",
				)
				.get()?.value ?? 0
		);
	}

	static getSummary(period: Period) {
		StatsService.flush();

		const since = Math.floor(Date.now() / 1000) - PERIOD_HOURS[period] * 3600;

		const totals = StatsService.db
			.query<TotalsRow, [number]>(
				`SELECT
				COUNT(*) as total,
				COALESCE(SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END), 0) as errors,
				COALESCE(SUM(CASE WHEN status_code >= 500 THEN 1 ELSE 0 END), 0) as server_errors,
				COALESCE(ROUND(AVG(response_time_ms)), 0) as avg_ms
			FROM request_stats WHERE created_at > ?`,
			)
			.get(since);

		// Nearest-rank percentile: offset into the response-time-sorted rows.
		const n = totals?.total ?? 0;
		const percentile = (p: number) =>
			n === 0
				? 0
				: (StatsService.db
						.query<PercentileRow, [number, number]>(
							"SELECT response_time_ms FROM request_stats WHERE created_at > ? ORDER BY response_time_ms LIMIT 1 OFFSET ?",
						)
						.get(since, Math.floor(p * (n - 1)))?.response_time_ms ?? 0);

		const p50Ms = percentile(0.5);
		const p95Ms = percentile(0.95);
		const p99Ms = percentile(0.99);

		const endpoints = StatsService.db
			.query<EndpointRow, [number]>(
				`SELECT
				endpoint,
				COUNT(*) as count,
				ROUND(AVG(response_time_ms)) as avg_ms,
				ROUND(CAST(SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) AS FLOAT) / COUNT(*), 4) as error_rate
			FROM request_stats WHERE created_at > ?
			GROUP BY endpoint ORDER BY count DESC`,
			)
			.all(since);

		const endpointPercentiles = StatsService.db
			.query<EndpointPercentileRow, [number]>(
				`WITH ranked AS (
					SELECT endpoint, response_time_ms,
						ROW_NUMBER() OVER (PARTITION BY endpoint ORDER BY response_time_ms) AS rn,
						COUNT(*) OVER (PARTITION BY endpoint) AS cnt
					FROM request_stats WHERE created_at > ?
				)
				SELECT endpoint,
					MAX(CASE WHEN rn = ((cnt-1)*95)/100 + 1 THEN response_time_ms END) AS p95_ms,
					MAX(CASE WHEN rn = ((cnt-1)*99)/100 + 1 THEN response_time_ms END) AS p99_ms
				FROM ranked GROUP BY endpoint`,
			)
			.all(since);
		const percentileByEndpoint = new Map(
			endpointPercentiles.map((r) => [r.endpoint, r]),
		);

		const statusCodes = StatsService.db
			.query<StatusCodeRow, [number]>(
				`SELECT status_code, COUNT(*) as count
			FROM request_stats WHERE created_at > ?
			GROUP BY status_code ORDER BY count DESC`,
			)
			.all(since);

		return {
			period,
			totalRequests: totals?.total ?? 0,
			errorRate:
				totals && totals.total > 0
					? Number((totals.errors / totals.total).toFixed(4))
					: 0,
			serverErrorRate:
				totals && totals.total > 0
					? Number((totals.server_errors / totals.total).toFixed(4))
					: 0,
			avgResponseTimeMs: totals?.avg_ms ?? 0,
			p50Ms,
			p95Ms,
			p99Ms,
			endpoints: endpoints.map((e) => {
				const p = percentileByEndpoint.get(e.endpoint);
				return {
					endpoint: e.endpoint,
					count: e.count,
					avgMs: e.avg_ms,
					errorRate: e.error_rate,
					p95Ms: p?.p95_ms ?? e.avg_ms,
					p99Ms: p?.p99_ms ?? e.avg_ms,
				};
			}),
			statusCodes: Object.fromEntries(
				statusCodes.map((s) => [String(s.status_code), s.count]),
			),
		};
	}

	static getRecitationPlays(
		period: Period | "all",
	): { recitationId: string; plays: number }[] {
		StatsService.flush();

		const since =
			period === "all"
				? 0
				: Math.floor(Date.now() / 1000) - PERIOD_HOURS[period] * 3600;

		return StatsService.db
			.query<RecitationPlaysRow, [number]>(
				"SELECT recitation_id, COUNT(*) as plays FROM recitation_plays WHERE created_at > ? GROUP BY recitation_id ORDER BY plays DESC",
			)
			.all(since)
			.map((r) => ({ recitationId: r.recitation_id, plays: r.plays }));
	}
}
