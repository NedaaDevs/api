import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { SQLITE_DB_PATH } from "@/config/db";
import { RECITATION_IDS } from "@/modules/quran/quran.audio";
import { EDITION_IDS } from "@/modules/quran/quran.editions";

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

interface MetaValueRow {
	value: number;
}

// A daily-bucket rollup row — `plays:{id}` / `downloads:{version}` /
// `requests:{module}` key families, summed for one calendar day (UTC).
interface DailyBucketRow {
	key: string;
	total: number;
}

// UTC calendar day, `daysAgo` back from now. stats_daily keys off these.
const dayString = (daysAgo = 0) =>
	new Date(Date.now() - daysAgo * 86_400_000).toISOString().slice(0, 10);

const FLUSH_INTERVAL_MS = 10_000;
const RETENTION_DAYS = 90;
const SWEEP_INTERVAL_MS = 3_600_000;

const PERIOD_HOURS = { "24h": 24, "7d": 168, "30d": 720 } as const;
export type Period = keyof typeof PERIOD_HOURS;

// Counter windows — distinct from `Period` above (which stays 24h/7d/30d for
// the request-latency summary and keeps its own semantics). "day" reads raw
// rows where one exists (sub-day precision), otherwise today's bucket;
// everything else sums durable daily buckets, immune to the 90-day raw sweep.
const COUNTER_PERIOD_DAYS = { week: 7, month: 30, year: 365 } as const;
export type CounterPeriod = "day" | "week" | "month" | "year" | "all";
export const COUNTER_PERIODS: readonly CounterPeriod[] = [
	"day",
	"week",
	"month",
	"year",
	"all",
];

// Anything outside this set (health pings, scanner/404 junk) is excluded
// from the rollup rather than bucketed as "other".
const KNOWN_MODULES = new Set([
	"prayers",
	"quran",
	"athkar",
	"locations",
	"feedback",
]);
const moduleOf = (endpoint: string): string | null => {
	const segment = endpoint.replace(/^\/v3\//, "").split("/")[0] ?? "";
	return KNOWN_MODULES.has(segment) ? segment : null;
};

// Paths no real client ever requests — bots probing for secrets and admin
// panels. We serve none of these, so a hit is an intrusion attempt; counted at
// read time and surfaced as a lighthearted "attacks repelled" number.
const PROBE_PATTERNS = [
	"%.env%",
	"%.git%",
	"%.aws%",
	"%.ssh%",
	"%wp-admin%",
	"%wp-login%",
	"%wp-config%",
	"%xmlrpc.php%",
	"%phpmyadmin%",
	"%/administrator%",
	"%/vendor/%",
	"%/config.json%",
];

// biome-ignore lint/complexity/noStaticOnlyClass: project pattern
export abstract class StatsService {
	private static db: Database;
	private static buffer: StatEntry[] = [];
	private static playBuffer: string[] = [];
	private static downloadBuffer: string[] = [];
	private static insertStmt: ReturnType<Database["prepare"]>;
	private static insertPlayStmt: ReturnType<Database["prepare"]>;
	private static insertDownloadStmt: ReturnType<Database["prepare"]>;
	// Lifetime scalar upsert — total_requests/total_plays/total_downloads.
	// Per-id counts live in stats_daily instead; only these three can't be
	// derived from it.
	private static incrementMetaStmt: ReturnType<Database["prepare"]>;
	// Per-(day, key) rollup upsert — the sole store for per-id counts, and what
	// every counter window above "day" reads.
	private static incrementDailyStmt: ReturnType<Database["prepare"]>;
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
		StatsService.db.run(`
			CREATE TABLE IF NOT EXISTS quran_downloads (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				version TEXT NOT NULL,
				created_at INTEGER NOT NULL DEFAULT (unixepoch())
			)
		`);
		StatsService.db.run(
			"CREATE INDEX IF NOT EXISTS idx_downloads_version ON quran_downloads(version, created_at)",
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
		StatsService.db.run(
			"INSERT OR IGNORE INTO stats_meta (key, value) VALUES ('total_downloads', 0)",
		);
		// Durable daily rollups, keyed the same way as stats_meta — NEVER swept
		// (a few thousand rows/year at this id count is negligible), so
		// week/month/year windows survive the 90-day raw-row retention cutoff.
		StatsService.db.run(`
			CREATE TABLE IF NOT EXISTS stats_daily (
				day TEXT NOT NULL,
				key TEXT NOT NULL,
				count INTEGER NOT NULL,
				PRIMARY KEY (day, key)
			)
		`);
		// Per-id lifetime counts moved to stats_daily, which holds strictly more
		// (it got the raw-row backfill these keys never did). Dead rows now.
		StatsService.db.run(
			"DELETE FROM stats_meta WHERE key LIKE 'plays:%' OR key LIKE 'downloads:%'",
		);

		StatsService.insertStmt = StatsService.db.prepare(
			"INSERT INTO request_stats (endpoint, method, status_code, response_time_ms) VALUES ($endpoint, $method, $statusCode, $responseTimeMs)",
		);
		StatsService.insertPlayStmt = StatsService.db.prepare(
			"INSERT INTO recitation_plays (recitation_id) VALUES ($id)",
		);
		StatsService.insertDownloadStmt = StatsService.db.prepare(
			"INSERT INTO quran_downloads (version) VALUES ($version)",
		);
		// Upsert rather than UPDATE so a missing scalar key self-heals.
		StatsService.incrementMetaStmt = StatsService.db.prepare(
			"INSERT INTO stats_meta (key, value) VALUES ($key, $n) ON CONFLICT(key) DO UPDATE SET value = value + $n",
		);
		StatsService.incrementDailyStmt = StatsService.db.prepare(
			"INSERT INTO stats_daily (day, key, count) VALUES ($day, $key, $n) ON CONFLICT(day, key) DO UPDATE SET count = count + $n",
		);

		// After the prepares — backfillRequestBucketsOnce needs incrementDailyStmt.
		StatsService.backfillDailyBucketsOnce();
		StatsService.backfillRequestBucketsOnce();

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

	// One-time migration: seed stats_daily from whatever raw rows still exist
	// (bounded by the 90-day sweep) so week/month/year windows aren't empty on
	// the release that introduces bucketing. Guarded by stats_daily being empty
	// — every later startup is a no-op, and flush() is the only writer after that.
	private static backfillDailyBucketsOnce(): void {
		const dailyIsEmpty =
			StatsService.db
				.query<{ c: number }, []>("SELECT COUNT(*) as c FROM stats_daily")
				.get()?.c === 0;
		if (!dailyIsEmpty) return;

		const rawRowCount =
			StatsService.db
				.query<{ c: number }, []>(
					"SELECT (SELECT COUNT(*) FROM recitation_plays) + (SELECT COUNT(*) FROM quran_downloads) as c",
				)
				.get()?.c ?? 0;
		if (rawRowCount === 0) return;

		StatsService.db.run(`
			INSERT INTO stats_daily (day, key, count)
			SELECT date(created_at, 'unixepoch') as day, 'plays:' || recitation_id as key, COUNT(*) as count
			FROM recitation_plays
			GROUP BY day, recitation_id
			ON CONFLICT(day, key) DO UPDATE SET count = count + excluded.count
		`);
		StatsService.db.run(`
			INSERT INTO stats_daily (day, key, count)
			SELECT date(created_at, 'unixepoch') as day, 'downloads:' || version as key, COUNT(*) as count
			FROM quran_downloads
			GROUP BY day, version
			ON CONFLICT(day, key) DO UPDATE SET count = count + excluded.count
		`);
	}

	// Seeds `requests:{module}` buckets from surviving request_stats rows, so
	// permanent traffic history starts from whatever the 90-day sweep still
	// holds rather than from deploy. Guarded on the family being absent, so it
	// runs once. Aggregates through `moduleOf` in JS rather than reimplementing
	// its path parsing in SQL, where the two could silently drift apart.
	private static backfillRequestBucketsOnce(): void {
		const seeded = StatsService.db
			.query<{ one: number }, []>(
				"SELECT 1 as one FROM stats_daily WHERE key LIKE 'requests:%' LIMIT 1",
			)
			.get();
		if (seeded) return;

		const rows = StatsService.db
			.query<{ day: string; endpoint: string; n: number }, []>(
				"SELECT date(created_at, 'unixepoch') as day, endpoint, COUNT(*) as n FROM request_stats GROUP BY day, endpoint",
			)
			.all();
		if (rows.length === 0) return;

		const buckets = new Map<string, number>();
		for (const row of rows) {
			const module = moduleOf(row.endpoint);
			if (!module) continue;
			const key = `${row.day} ${module}`;
			buckets.set(key, (buckets.get(key) ?? 0) + row.n);
		}

		StatsService.db.transaction(() => {
			for (const [composite, n] of buckets) {
				const [day, module] = composite.split(" ");
				StatsService.incrementDailyStmt.run({
					$day: day,
					$key: `requests:${module}`,
					$n: n,
				});
			}
		})();
	}

	static record(entry: StatEntry) {
		StatsService.buffer.push(entry);
	}

	static recordPlay(recitationId: string): void {
		StatsService.playBuffer.push(recitationId);
	}

	static recordDownload(version: string): void {
		StatsService.downloadBuffer.push(version);
	}

	static flush() {
		if (
			StatsService.buffer.length === 0 &&
			StatsService.playBuffer.length === 0 &&
			StatsService.downloadBuffer.length === 0
		) {
			return;
		}
		const entries = StatsService.buffer.splice(0);
		const plays = StatsService.playBuffer.splice(0);
		const downloads = StatsService.downloadBuffer.splice(0);
		// One day value for the whole batch — a flush spanning a UTC midnight is
		// a non-issue at a 10s flush interval.
		const today = dayString();

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
			for (const version of downloads) {
				StatsService.insertDownloadStmt.run({ $version: version });
			}
			// Per-id counts live only in stats_daily — stats_meta keeps just the
			// scalars, which can't be derived (request_stats is swept and has no
			// per-row survivor).
			const bucket = (prefix: string, items: string[]) => {
				for (const [id, n] of StatsService.countBy(items)) {
					StatsService.incrementDailyStmt.run({
						$day: today,
						$key: `${prefix}${id}`,
						$n: n,
					});
				}
			};

			if (entries.length > 0) {
				StatsService.incrementMetaStmt.run({
					$key: "total_requests",
					$n: entries.length,
				});
				// Unknown modules (health pings, scanner junk) are dropped, matching
				// how getSummary's rollup treats them.
				bucket(
					"requests:",
					entries
						.map((e) => moduleOf(e.endpoint))
						.filter((m): m is string => m !== null),
				);
			}
			if (plays.length > 0) {
				StatsService.incrementMetaStmt.run({
					$key: "total_plays",
					$n: plays.length,
				});
				bucket("plays:", plays);
			}
			if (downloads.length > 0) {
				StatsService.incrementMetaStmt.run({
					$key: "total_downloads",
					$n: downloads.length,
				});
				bucket("downloads:", downloads);
			}
		});
		run();
	}

	// Per-key occurrence counts, so a batch with repeats issues one upsert per
	// distinct id instead of one per row.
	private static countBy(items: string[]): Map<string, number> {
		const counts = new Map<string, number>();
		for (const item of items) {
			counts.set(item, (counts.get(item) ?? 0) + 1);
		}
		return counts;
	}

	// stats_meta and stats_daily are intentionally absent here — they're durable
	// counters, not raw event rows, and are never swept. stats_daily in
	// particular is what keeps history alive past this cutoff.
	private static sweep() {
		const cutoff = Math.floor(Date.now() / 1000) - RETENTION_DAYS * 86_400;
		StatsService.db.run("DELETE FROM request_stats WHERE created_at < ?", [
			cutoff,
		]);
		StatsService.db.run("DELETE FROM recitation_plays WHERE created_at < ?", [
			cutoff,
		]);
		StatsService.db.run("DELETE FROM quran_downloads WHERE created_at < ?", [
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

		const probeClause = PROBE_PATTERNS.map(() => "endpoint LIKE ?").join(
			" OR ",
		);
		const intrusionAttempts =
			StatsService.db
				.query<{ n: number }, [number, ...string[]]>(
					`SELECT COUNT(*) as n FROM request_stats WHERE created_at > ? AND (${probeClause})`,
				)
				.get(since, ...PROBE_PATTERNS)?.n ?? 0;

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

		const moduleTotals = new Map<
			string,
			{ count: number; msSum: number; errSum: number }
		>();
		for (const e of endpoints) {
			const key = moduleOf(e.endpoint);
			if (key === null) continue;
			const totals = moduleTotals.get(key) ?? { count: 0, msSum: 0, errSum: 0 };
			totals.count += e.count;
			totals.msSum += e.count * e.avg_ms;
			totals.errSum += e.count * e.error_rate;
			moduleTotals.set(key, totals);
		}
		const modules = Array.from(moduleTotals.entries())
			.map(([module, t]) => ({
				module,
				count: t.count,
				avgMs: Math.round(t.msSum / t.count),
				errorRate: Number((t.errSum / t.count).toFixed(4)),
			}))
			.sort((a, b) => b.count - a.count || a.module.localeCompare(b.module));

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
			modules,
			intrusionAttempts,
		};
	}

	// Sums a `${prefix}{id}` daily-bucket family from `cutoffDay` onward, or over
	// all time when omitted. stats_daily is never swept, so these totals are
	// unaffected by the 90-day raw-row retention. Day strings sort
	// lexicographically the same as chronologically, so a plain string
	// comparison bounds the window.
	private static getBucketCounts(
		prefix: string,
		cutoffDay?: string,
	): Map<string, number> {
		const rows = cutoffDay
			? StatsService.db
					.query<DailyBucketRow, [string, string]>(
						"SELECT key, SUM(count) as total FROM stats_daily WHERE day >= ? AND key LIKE ? || '%' GROUP BY key",
					)
					.all(cutoffDay, prefix)
			: StatsService.db
					.query<DailyBucketRow, [string]>(
						"SELECT key, SUM(count) as total FROM stats_daily WHERE key LIKE ? || '%' GROUP BY key",
					)
					.all(prefix);

		return new Map(rows.map((r) => [r.key.slice(prefix.length), r.total]));
	}

	// Resolves a CounterPeriod to a per-id count map for one key family. "day"
	// reads raw rows for sub-day precision where a raw table exists; everything
	// else sums durable daily buckets, with "all" spanning them entirely.
	// Every id in `knownIds` is 0-filled, so callers get the full roster
	// regardless of period and never have to backfill gaps themselves.
	private static getCounterCounts(
		prefix: string,
		period: CounterPeriod,
		knownIds: ReadonlySet<string>,
		raw?: {
			table: "recitation_plays" | "quran_downloads";
			idColumn: "recitation_id" | "version";
		},
	): [string, number][] {
		let counts: Map<string, number>;
		if (period === "all") {
			counts = StatsService.getBucketCounts(prefix);
		} else if (period === "day" && raw) {
			const since = Math.floor(Date.now() / 1000) - 24 * 3600;
			const rows = StatsService.db
				.query<{ id: string; n: number }, [number]>(
					`SELECT ${raw.idColumn} as id, COUNT(*) as n FROM ${raw.table} WHERE created_at > ? GROUP BY ${raw.idColumn}`,
				)
				.all(since);
			counts = new Map(rows.map((r) => [r.id, r.n]));
		} else {
			// "day" without a raw table falls back to today's bucket.
			const days = period === "day" ? 0 : COUNTER_PERIOD_DAYS[period];
			counts = StatsService.getBucketCounts(prefix, dayString(days));
		}

		for (const id of knownIds) {
			if (!counts.has(id)) counts.set(id, 0);
		}
		// Count desc, id asc — stable across calls for equal counts.
		return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
	}

	static getRecitationPlays(
		period: CounterPeriod,
	): { recitationId: string; plays: number }[] {
		StatsService.flush();

		return StatsService.getCounterCounts("plays:", period, RECITATION_IDS, {
			table: "recitation_plays",
			idColumn: "recitation_id",
		}).map(([recitationId, plays]) => ({ recitationId, plays }));
	}

	// Permanent per-module traffic history. Unlike plays/downloads there's no
	// raw fallback for "day" — request_stats has endpoints, not modules — so
	// every window reads the durable buckets.
	static getRequestsByModule(
		period: CounterPeriod,
	): { module: string; requests: number }[] {
		StatsService.flush();

		return StatsService.getCounterCounts(
			"requests:",
			period,
			KNOWN_MODULES,
		).map(([module, requests]) => ({ module, requests }));
	}

	static getQuranDownloads(
		period: CounterPeriod,
	): { version: string; downloads: number }[] {
		StatsService.flush();

		return StatsService.getCounterCounts("downloads:", period, EDITION_IDS, {
			table: "quran_downloads",
			idColumn: "version",
		}).map(([version, downloads]) => ({ version, downloads }));
	}
}
