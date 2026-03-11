import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";

export interface StatEntry {
	endpoint: string;
	method: string;
	statusCode: number;
	responseTimeMs: number;
}

interface TotalsRow {
	total: number;
	errors: number;
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

const DB_PATH = "data/stats.db";
const FLUSH_INTERVAL_MS = 10_000;

const PERIOD_HOURS = { "24h": 24, "7d": 168, "30d": 720 } as const;
export type Period = keyof typeof PERIOD_HOURS;

// biome-ignore lint/complexity/noStaticOnlyClass: project pattern
export abstract class StatsService {
	private static db: Database;
	private static buffer: StatEntry[] = [];
	private static insertStmt: ReturnType<Database["prepare"]>;
	private static flushTimer: Timer;

	static init() {
		mkdirSync("data", { recursive: true });
		StatsService.db = new Database(DB_PATH);
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

		StatsService.insertStmt = StatsService.db.prepare(
			"INSERT INTO request_stats (endpoint, method, status_code, response_time_ms) VALUES ($endpoint, $method, $statusCode, $responseTimeMs)",
		);

		StatsService.flushTimer = setInterval(
			() => StatsService.flush(),
			FLUSH_INTERVAL_MS,
		);
	}

	static record(entry: StatEntry) {
		StatsService.buffer.push(entry);
	}

	static flush() {
		if (StatsService.buffer.length === 0) return;
		const entries = StatsService.buffer.splice(0);
		const insertMany = StatsService.db.transaction((items: StatEntry[]) => {
			for (const item of items) {
				StatsService.insertStmt.run({
					$endpoint: item.endpoint,
					$method: item.method,
					$statusCode: item.statusCode,
					$responseTimeMs: item.responseTimeMs,
				});
			}
		});
		insertMany(entries);
	}

	static getSummary(period: Period) {
		StatsService.flush();

		const since = Math.floor(Date.now() / 1000) - PERIOD_HOURS[period] * 3600;

		const totals = StatsService.db
			.query<TotalsRow, [number]>(
				`SELECT
				COUNT(*) as total,
				COALESCE(SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END), 0) as errors,
				COALESCE(ROUND(AVG(response_time_ms)), 0) as avg_ms
			FROM request_stats WHERE created_at > ?`,
			)
			.get(since);

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
			avgResponseTimeMs: totals?.avg_ms ?? 0,
			endpoints: endpoints.map((e) => ({
				endpoint: e.endpoint,
				count: e.count,
				avgMs: e.avg_ms,
				errorRate: e.error_rate,
			})),
			statusCodes: Object.fromEntries(
				statusCodes.map((s) => [String(s.status_code), s.count]),
			),
		};
	}
}
