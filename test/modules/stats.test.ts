import { Database } from "bun:sqlite";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Elysia } from "elysia";
import { env } from "@/config/env";
import { quranModule, RATE_LIMIT_MAX } from "@/modules/quran";
import { RECITATION_IDS } from "@/modules/quran/quran.audio";
import { EDITION_IDS } from "@/modules/quran/quran.editions";
import { isAdmin, statsModule } from "@/modules/stats";
import type { StatEntry } from "@/modules/stats/stats.service";
import { StatsService } from "@/modules/stats/stats.service";
import { errorHandler } from "@/shared/plugins/error-handler";

beforeAll(() => {
	StatsService.init(":memory:");
});

afterAll(() => {
	StatsService.shutdown();
});

const statsApp = new Elysia().use(errorHandler).use(statsModule);
const quranApp = new Elysia().use(errorHandler).use(quranModule);

const adminHeaders = { "x-admin-key": env.ADMIN_API_KEY };

const getSummaryRoute = (headers: Record<string, string> = {}) =>
	statsApp.handle(new Request("http://localhost/stats/summary", { headers }));

const getRecitationsRoute = (
	headers: Record<string, string> = adminHeaders,
	period?: string,
) =>
	statsApp.handle(
		new Request(
			`http://localhost/stats/recitations${period ? `?period=${period}` : ""}`,
			{ headers },
		),
	);

const getRequestsRoute = (
	headers: Record<string, string> = adminHeaders,
	period?: string,
) =>
	statsApp.handle(
		new Request(
			`http://localhost/stats/requests${period ? `?period=${period}` : ""}`,
			{ headers },
		),
	);

const getQuranDownloadsRoute = (
	headers: Record<string, string> = adminHeaders,
	period?: string,
) =>
	statsApp.handle(
		new Request(
			`http://localhost/stats/quran-downloads${period ? `?period=${period}` : ""}`,
			{ headers },
		),
	);

const postPlay = (recitationId: string, xff: string) =>
	quranApp.handle(
		new Request("http://localhost/quran/plays", {
			method: "POST",
			headers: {
				"content-type": "application/json",
				"x-forwarded-for": xff,
			},
			body: JSON.stringify({ recitationId }),
		}),
	);

const postDownload = (version: string, xff: string) =>
	quranApp.handle(
		new Request("http://localhost/quran/downloads", {
			method: "POST",
			headers: {
				"content-type": "application/json",
				"x-forwarded-for": xff,
			},
			body: JSON.stringify({ version }),
		}),
	);

// Running totals of everything this file inserts into request_stats within
// the 24h window. The percentile test relies on being first (see below); the
// error-rate test uses these to assert exact global rates without coupling
// to how many rows other describe blocks happen to add.
let totalRecorded = 0;
let errorRecorded = 0;
let serverErrorRecorded = 0;

const record = (entry: StatEntry) => {
	StatsService.record(entry);
	totalRecorded++;
	if (entry.statusCode >= 400) errorRecorded++;
	if (entry.statusCode >= 500) serverErrorRecorded++;
};

// Running totals of recitation plays this file records, for the cumulative
// /stats/recitations assertions at the end of the file.
const playCounts = new Map<string, number>();
const trackPlay = (id: string, n = 1) => {
	playCounts.set(id, (playCounts.get(id) ?? 0) + n);
};

// Running totals of quran downloads this file records, for the cumulative
// /stats/quran-downloads assertions at the end of the file.
const downloadCounts = new Map<string, number>();
const trackDownload = (version: string, n = 1) => {
	downloadCounts.set(version, (downloadCounts.get(version) ?? 0) + n);
};

describe("isAdmin", () => {
	test("false when key is undefined", () => {
		expect(isAdmin({ "x-admin-key": "anything" }, undefined)).toBe(false);
	});

	test("false when key is an empty string", () => {
		expect(isAdmin({ "x-admin-key": "" }, "")).toBe(false);
	});

	test("false when the header does not match the key", () => {
		expect(isAdmin({ "x-admin-key": "wrong" }, "secret")).toBe(false);
	});

	test("false when the header is missing", () => {
		expect(isAdmin({}, "secret")).toBe(false);
	});

	test("true only on an exact match", () => {
		expect(isAdmin({ "x-admin-key": "secret" }, "secret")).toBe(true);
	});
});

describe("daily bucket backfill", () => {
	// Isolated file-backed instance, not the shared :memory: one — this needs
	// raw rows to exist BEFORE StatsService.init() ever sees the file, so it
	// exercises the real first-boot migration path. Restores a fresh shared
	// :memory: instance afterward, so it must run before any other test
	// touches StatsService state (see "percentiles" below, which documents
	// the same requirement for its own reasons).
	test("seeds stats_daily once from pre-existing raw rows, guarded against re-running", () => {
		StatsService.shutdown();
		const tmpPath = join(tmpdir(), `stats-backfill-test-${Date.now()}.sqlite`);

		const seed = new Database(tmpPath);
		seed.run(`
			CREATE TABLE recitation_plays (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				recitation_id TEXT NOT NULL,
				created_at INTEGER NOT NULL DEFAULT (unixepoch())
			)
		`);
		seed.run(`
			CREATE TABLE quran_downloads (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				version TEXT NOT NULL,
				created_at INTEGER NOT NULL DEFAULT (unixepoch())
			)
		`);
		seed.run(`
			CREATE TABLE request_stats (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				endpoint TEXT NOT NULL,
				method TEXT NOT NULL,
				status_code INTEGER NOT NULL,
				response_time_ms INTEGER NOT NULL,
				created_at INTEGER NOT NULL DEFAULT (unixepoch())
			)
		`);
		const day1 = Math.floor(new Date("2026-01-01T12:00:00Z").getTime() / 1000);
		const day2 = Math.floor(new Date("2026-01-02T12:00:00Z").getTime() / 1000);
		for (const createdAt of [day1, day1, day2]) {
			seed.run(
				"INSERT INTO recitation_plays (recitation_id, created_at) VALUES (?, ?)",
				["backfill-test-id", createdAt],
			);
		}
		seed.run(
			"INSERT INTO quran_downloads (version, created_at) VALUES (?, ?)",
			["v1", day1],
		);
		// Two quran hits and one unknown-module hit on day1: only the former
		// should bucket, matching how moduleOf filters health/scanner junk.
		for (const [endpoint, createdAt] of [
			["/v3/quran/manifest", day1],
			["/v3/quran/manifest", day1],
			["/health", day1],
			["/v3/prayers/today", day2],
		] as const) {
			seed.run(
				"INSERT INTO request_stats (endpoint, method, status_code, response_time_ms, created_at) VALUES (?, 'GET', 200, 5, ?)",
				[endpoint, createdAt],
			);
		}
		seed.close();

		try {
			StatsService.init(tmpPath);
			const svc = StatsService as unknown as { db: Database };

			const playBuckets = svc.db
				.query<{ day: string; count: number }, [string]>(
					"SELECT day, count FROM stats_daily WHERE key = ? ORDER BY day",
				)
				.all("plays:backfill-test-id");
			expect(playBuckets).toEqual([
				{ day: "2026-01-01", count: 2 },
				{ day: "2026-01-02", count: 1 },
			]);

			const requestBuckets = svc.db
				.query<{ day: string; key: string; count: number }, []>(
					"SELECT day, key, count FROM stats_daily WHERE key LIKE 'requests:%' ORDER BY day",
				)
				.all();
			expect(requestBuckets).toEqual([
				{ day: "2026-01-01", key: "requests:quran", count: 2 },
				{ day: "2026-01-02", key: "requests:prayers", count: 1 },
			]);

			const downloadBucket = svc.db
				.query<{ count: number }, [string, string]>(
					"SELECT count FROM stats_daily WHERE day = ? AND key = ?",
				)
				.get("2026-01-01", "downloads:v1");
			expect(downloadBucket?.count).toBe(1);

			// Restart against the same file: stats_daily is now non-empty, so the
			// guard must skip re-running the backfill — no double-counting.
			StatsService.shutdown();
			StatsService.init(tmpPath);
			const afterRestart = (StatsService as unknown as { db: Database }).db
				.query<{ count: number }, [string, string]>(
					"SELECT count FROM stats_daily WHERE day = ? AND key = ?",
				)
				.get("2026-01-01", "plays:backfill-test-id");
			expect(afterRestart?.count).toBe(2);
		} finally {
			StatsService.shutdown();
			for (const suffix of ["", "-wal", "-shm"]) {
				rmSync(`${tmpPath}${suffix}`, { force: true });
			}
			// Restore the shared instance the rest of this file runs against.
			StatsService.init(":memory:");
		}
	});
});

describe("/stats/summary auth", () => {
	test("401 with no admin header", async () => {
		const res = await getSummaryRoute();
		expect(res.status).toBe(401);
	});

	test("401 with the wrong admin key", async () => {
		const res = await getSummaryRoute({ "x-admin-key": "wrong-key" });
		expect(res.status).toBe(401);
	});

	test("200 with the real admin key", async () => {
		const res = await getSummaryRoute(adminHeaders);
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.period).toBe("24h");
	});
});

describe("percentiles", () => {
	// Must be the first test in the file to touch request_stats: the global
	// p50/p95/p99 assertions below assume these 100 rows are the only rows
	// in the 24h window.
	test("nearest-rank p50/p95/p99 over 100 samples", () => {
		for (let ms = 1; ms <= 100; ms++) {
			record({
				endpoint: "/perf",
				method: "GET",
				statusCode: 200,
				responseTimeMs: ms,
			});
		}

		const summary = StatsService.getSummary("24h");
		expect(summary.p50Ms).toBe(50);
		expect(summary.p95Ms).toBe(95);
		expect(summary.p99Ms).toBe(99);

		const perf = summary.endpoints.find((e) => e.endpoint === "/perf");
		expect(perf?.p95Ms).toBe(95);
		expect(perf?.p99Ms).toBe(99);
	});
});

describe("error rates", () => {
	test("serverErrorRate counts only >=500, errorRate counts >=400", () => {
		const endpoint = "/error-rate-test";
		for (let i = 0; i < 10; i++) {
			record({ endpoint, method: "GET", statusCode: 500, responseTimeMs: 5 });
		}
		for (let i = 0; i < 10; i++) {
			record({ endpoint, method: "GET", statusCode: 404, responseTimeMs: 5 });
		}

		const summary = StatsService.getSummary("24h");

		// Per-endpoint row: isolated from other tests' rows via GROUP BY endpoint.
		const row = summary.endpoints.find((e) => e.endpoint === endpoint);
		expect(row?.count).toBe(20);
		expect(row?.errorRate).toBe(1);

		// Global rates: computed from everything this file has recorded so far,
		// so this stays correct regardless of describe-block ordering.
		expect(summary.totalRequests).toBe(totalRecorded);
		expect(summary.errorRate).toBe(
			Number((errorRecorded / totalRecorded).toFixed(4)),
		);
		expect(summary.serverErrorRate).toBe(
			Number((serverErrorRecorded / totalRecorded).toFixed(4)),
		);
	});
});

describe("lifetime counter", () => {
	test("increases by exactly N after recording and flushing", () => {
		const before = StatsService.getLifetimeRequests();
		const n = 7;
		for (let i = 0; i < n; i++) {
			record({
				endpoint: "/lifetime-test",
				method: "GET",
				statusCode: 200,
				responseTimeMs: 3,
			});
		}
		StatsService.flush();
		const after = StatsService.getLifetimeRequests();
		expect(after - before).toBe(n);
	});
});

describe("retention sweep", () => {
	test("purges rows older than 90 days without touching the lifetime counter", () => {
		const svc = StatsService as unknown as {
			db: Database;
			sweep(): void;
		};
		const staleCreatedAt = Math.floor(Date.now() / 1000) - 91 * 86_400;

		svc.db.run(
			"INSERT INTO request_stats (endpoint, method, status_code, response_time_ms, created_at) VALUES (?, ?, ?, ?, ?)",
			["/stale-retention", "GET", 200, 5, staleCreatedAt],
		);
		svc.db.run(
			"INSERT INTO recitation_plays (recitation_id, created_at) VALUES (?, ?)",
			["stale-recitation-id", staleCreatedAt],
		);
		svc.db.run(
			"INSERT INTO quran_downloads (version, created_at) VALUES (?, ?)",
			["v1", staleCreatedAt],
		);
		// A daily bucket dated a year ago — stats_daily has no retention policy,
		// so the sweep must leave it alone even though it's far older than any
		// raw row the sweep purges.
		svc.db.run("INSERT INTO stats_daily (day, key, count) VALUES (?, ?, ?)", [
			"2025-01-01",
			"plays:sweep-bucket-test",
			3,
		]);

		const beforeLifetime = StatsService.getLifetimeRequests();
		svc.sweep();
		const afterLifetime = StatsService.getLifetimeRequests();

		const staleStats = svc.db
			.query<{ c: number }, [string]>(
				"SELECT COUNT(*) as c FROM request_stats WHERE endpoint = ?",
			)
			.get("/stale-retention");
		expect(staleStats?.c).toBe(0);

		const stalePlays = svc.db
			.query<{ c: number }, [string]>(
				"SELECT COUNT(*) as c FROM recitation_plays WHERE recitation_id = ?",
			)
			.get("stale-recitation-id");
		expect(stalePlays?.c).toBe(0);

		const staleDownloads = svc.db
			.query<{ c: number }, []>(
				"SELECT COUNT(*) as c FROM quran_downloads WHERE created_at < unixepoch() - 90*86400",
			)
			.get();
		expect(staleDownloads?.c).toBe(0);

		const bucketRow = svc.db
			.query<{ count: number }, [string]>(
				"SELECT count FROM stats_daily WHERE key = ?",
			)
			.get("plays:sweep-bucket-test");
		expect(bucketRow?.count).toBe(3);

		expect(afterLifetime).toBeGreaterThanOrEqual(beforeLifetime);
	});
});

describe("lifetime meta counters", () => {
	test("recordPlay's durable per-recitation counter survives the 90-day sweep", () => {
		const svc = StatsService as unknown as { db: Database; sweep(): void };
		const id = "alnufais"; // unused elsewhere in this file — safe to age/sweep in isolation

		StatsService.recordPlay(id);
		StatsService.flush();
		const afterRecord =
			StatsService.getRecitationPlays("all").find((p) => p.recitationId === id)
				?.plays ?? 0;
		expect(afterRecord).toBe(1);

		// Age the raw row we just inserted to past retention and sweep it away —
		// the durable meta counter must still report the lifetime total.
		const staleCreatedAt = Math.floor(Date.now() / 1000) - 91 * 86_400;
		svc.db.run(
			"UPDATE recitation_plays SET created_at = ? WHERE recitation_id = ?",
			[staleCreatedAt, id],
		);
		svc.sweep();

		const rawRows = svc.db
			.query<{ c: number }, [string]>(
				"SELECT COUNT(*) as c FROM recitation_plays WHERE recitation_id = ?",
			)
			.get(id);
		expect(rawRows?.c).toBe(0);

		const afterSweep =
			StatsService.getRecitationPlays("all").find((p) => p.recitationId === id)
				?.plays ?? 0;
		expect(afterSweep).toBe(1);
	});

	test("recordDownload's durable per-version counter survives the 90-day sweep", () => {
		const svc = StatsService as unknown as { db: Database; sweep(): void };
		const version = "v1";

		const beforeRecord =
			StatsService.getQuranDownloads("all").find((d) => d.version === version)
				?.downloads ?? 0;

		StatsService.recordDownload(version);
		StatsService.flush();
		trackDownload(version, 1); // stats_daily bucket writes at flush, so this
		// download counts toward month/week/year windows regardless of the raw
		// row's fate below — see the assertion this feeds at the end of the file.
		const afterRecord =
			StatsService.getQuranDownloads("all").find((d) => d.version === version)
				?.downloads ?? 0;
		expect(afterRecord).toBe(beforeRecord + 1);

		// Age only the row we just inserted (the newest) to past retention and
		// sweep it away — the durable meta counter must be unaffected.
		const staleCreatedAt = Math.floor(Date.now() / 1000) - 91 * 86_400;
		svc.db.run(
			"UPDATE quran_downloads SET created_at = ? WHERE id = (SELECT MAX(id) FROM quran_downloads WHERE version = ?)",
			[staleCreatedAt, version],
		);
		svc.sweep();

		const afterSweep =
			StatsService.getQuranDownloads("all").find((d) => d.version === version)
				?.downloads ?? 0;
		expect(afterSweep).toBe(afterRecord);
	});
});

describe("daily bucket upsert", () => {
	test("flush upserts one stats_daily row per (day, key), accumulating counts", () => {
		const svc = StatsService as unknown as { db: Database };
		const id = "bucket-upsert-test-recitation"; // synthetic — dedicated to this test
		const today = new Date().toISOString().slice(0, 10);

		StatsService.recordPlay(id);
		StatsService.recordPlay(id);
		StatsService.flush();

		const afterFirstFlush = svc.db
			.query<{ count: number }, [string, string]>(
				"SELECT count FROM stats_daily WHERE day = ? AND key = ?",
			)
			.get(today, `plays:${id}`);
		expect(afterFirstFlush?.count).toBe(2);

		StatsService.recordPlay(id);
		StatsService.flush();

		const rows = svc.db
			.query<{ count: number }, [string, string]>(
				"SELECT count FROM stats_daily WHERE day = ? AND key = ?",
			)
			.all(today, `plays:${id}`);
		expect(rows.length).toBe(1); // upsert, not a second row for the same day
		expect(rows[0]?.count).toBe(3);
	});
});

describe("counter window sums", () => {
	test("week/month/year sum durable daily buckets over the right trailing window", () => {
		const svc = StatsService as unknown as { db: Database };
		const key = "downloads:window-sum-test-version"; // synthetic — dedicated to this test
		const dayAgo = (n: number) =>
			new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);

		const seedBucket = (daysAgo: number, count: number) => {
			svc.db.run("INSERT INTO stats_daily (day, key, count) VALUES (?, ?, ?)", [
				dayAgo(daysAgo),
				key,
				count,
			]);
		};

		seedBucket(0, 5); // today — inside every window
		seedBucket(3, 2); // inside week/month/year
		seedBucket(20, 4); // outside week, inside month/year
		seedBucket(100, 8); // outside week/month, inside year
		seedBucket(400, 16); // outside every window

		const version = "window-sum-test-version";

		const week = StatsService.getQuranDownloads("week").find(
			(d) => d.version === version,
		);
		expect(week?.downloads).toBe(7); // day0 + day3

		const month = StatsService.getQuranDownloads("month").find(
			(d) => d.version === version,
		);
		expect(month?.downloads).toBe(11); // day0 + day3 + day20

		const year = StatsService.getQuranDownloads("year").find(
			(d) => d.version === version,
		);
		expect(year?.downloads).toBe(19); // day0 + day3 + day20 + day100
	});
});

describe("module rollup", () => {
	test("groups endpoints by module, excludes health/junk, sorts by count desc", () => {
		for (let i = 0; i < 3; i++) {
			record({
				endpoint: "/v3/prayers/timings",
				method: "GET",
				statusCode: 200,
				responseTimeMs: 10,
			});
		}
		for (let i = 0; i < 2; i++) {
			record({
				endpoint: "/v3/prayers/calendar",
				method: "GET",
				statusCode: 500,
				responseTimeMs: 20,
			});
		}
		record({
			endpoint: "/v3/locations/search",
			method: "GET",
			statusCode: 200,
			responseTimeMs: 5,
		});
		record({
			endpoint: "/v3/health",
			method: "GET",
			statusCode: 200,
			responseTimeMs: 1,
		});
		record({
			endpoint: "/wp-admin",
			method: "GET",
			statusCode: 404,
			responseTimeMs: 1,
		});

		const summary = StatsService.getSummary("24h");

		const prayers = summary.modules.find((m) => m.module === "prayers");
		expect(prayers?.count).toBe(5);
		expect(prayers?.avgMs).toBe(Math.round((3 * 10 + 2 * 20) / 5));
		expect(prayers?.errorRate).toBe(Number((2 / 5).toFixed(4)));

		const locations = summary.modules.find((m) => m.module === "locations");
		expect(locations?.count).toBe(1);

		expect(summary.modules.find((m) => m.module === "health")).toBeUndefined();
		expect(summary.modules.find((m) => m.module === "other")).toBeUndefined();

		for (let i = 1; i < summary.modules.length; i++) {
			expect(summary.modules[i - 1].count).toBeGreaterThanOrEqual(
				summary.modules[i].count,
			);
		}
	});
});

describe("recitation plays service", () => {
	test("recordPlay aggregates counts, ordered plays desc", () => {
		StatsService.recordPlay("minshawi-murattal");
		StatsService.recordPlay("minshawi-murattal");
		StatsService.recordPlay("muhammad-ayyoob");
		trackPlay("minshawi-murattal", 2);
		trackPlay("muhammad-ayyoob", 1);

		const plays = StatsService.getRecitationPlays("day");
		const minshawi = plays.find((p) => p.recitationId === "minshawi-murattal");
		const ayyoob = plays.find((p) => p.recitationId === "muhammad-ayyoob");
		expect(minshawi?.plays).toBe(2);
		expect(ayyoob?.plays).toBe(1);

		const minshawiIdx = plays.findIndex(
			(p) => p.recitationId === "minshawi-murattal",
		);
		const ayyoobIdx = plays.findIndex(
			(p) => p.recitationId === "muhammad-ayyoob",
		);
		expect(minshawiIdx).toBeLessThan(ayyoobIdx);

		for (let i = 1; i < plays.length; i++) {
			expect(plays[i - 1].plays).toBeGreaterThanOrEqual(plays[i].plays);
		}
	});
});

describe("quran downloads service", () => {
	test("recordDownload aggregates counts per version, ordered downloads desc", () => {
		StatsService.recordDownload("v1");
		StatsService.recordDownload("v1");
		StatsService.recordDownload("v2");
		trackDownload("v1", 2);
		trackDownload("v2", 1);

		const downloads = StatsService.getQuranDownloads("day");
		const v1 = downloads.find((d) => d.version === "v1");
		const v2 = downloads.find((d) => d.version === "v2");
		expect(v1?.downloads).toBe(2);
		expect(v2?.downloads).toBe(1);

		const v1Idx = downloads.findIndex((d) => d.version === "v1");
		const v2Idx = downloads.findIndex((d) => d.version === "v2");
		expect(v1Idx).toBeLessThan(v2Idx);

		for (let i = 1; i < downloads.length; i++) {
			expect(downloads[i - 1].downloads).toBeGreaterThanOrEqual(
				downloads[i].downloads,
			);
		}
	});
});

describe("plays route", () => {
	test("202 + {ok:true} for a real recitation id", async () => {
		const res = await postPlay("abdullah-khayat", "10.20.0.1");
		expect(res.status).toBe(202);
		const body = await res.json();
		expect(body).toEqual({ ok: true });
		trackPlay("abdullah-khayat", 1);
	});

	test("400 for an unknown recitation id", async () => {
		const res = await postPlay("not-a-real-id", "10.20.0.2");
		expect(res.status).toBe(400);
	});

	test("429 once the same IP exceeds the hourly cap", async () => {
		const ip = "10.20.0.3";
		const id = "khalid-al-jalil";
		for (let i = 0; i < RATE_LIMIT_MAX; i++) {
			const res = await postPlay(id, ip);
			expect(res.status).toBe(202);
		}
		trackPlay(id, RATE_LIMIT_MAX);

		const blocked = await postPlay(id, ip);
		expect(blocked.status).toBe(429);
	});
});

describe("downloads route", () => {
	test("202 + {ok:true} for a real version", async () => {
		const res = await postDownload("v4", "10.30.0.1");
		expect(res.status).toBe(202);
		const body = await res.json();
		expect(body).toEqual({ ok: true });
		trackDownload("v4", 1);
	});

	test("400 for an unknown version", async () => {
		const res = await postDownload("not-a-real-version", "10.30.0.2");
		expect(res.status).toBe(400);
	});

	test("429 once the same IP exceeds the hourly cap", async () => {
		const ip = "10.30.0.3";
		for (let i = 0; i < RATE_LIMIT_MAX; i++) {
			const res = await postDownload("v2", ip);
			expect(res.status).toBe(202);
		}
		trackDownload("v2", RATE_LIMIT_MAX);

		const blocked = await postDownload("v2", ip);
		expect(blocked.status).toBe(429);
	});
});

describe("/stats/recitations", () => {
	test("defaults to month, lists every known id with tracked counts, sorted desc", async () => {
		const res = await getRecitationsRoute();
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.period).toBe("month");
		expect(body.recitations.length).toBeGreaterThanOrEqual(RECITATION_IDS.size);

		const byId = new Map<string, number>(
			body.recitations.map((r: { recitationId: string; plays: number }) => [
				r.recitationId,
				r.plays,
			]),
		);

		for (const id of RECITATION_IDS) {
			expect(byId.has(id)).toBe(true);
		}

		// Never played anywhere in this file.
		expect(byId.get("muhammad-jibreel")).toBe(0);

		for (const [id, plays] of playCounts) {
			expect(byId.get(id)).toBe(plays);
		}

		for (let i = 1; i < body.recitations.length; i++) {
			expect(body.recitations[i - 1].plays).toBeGreaterThanOrEqual(
				body.recitations[i].plays,
			);
		}
	});

	test("period=all returns lifetime counts, including the alnufais play swept from raw rows", async () => {
		const res = await getRecitationsRoute(adminHeaders, "all");
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.period).toBe("all");
		expect(body.recitations.length).toBeGreaterThanOrEqual(RECITATION_IDS.size);

		const byId = new Map<string, number>(
			body.recitations.map((r: { recitationId: string; plays: number }) => [
				r.recitationId,
				r.plays,
			]),
		);

		for (const id of RECITATION_IDS) {
			expect(byId.has(id)).toBe(true);
		}

		// Recorded then swept from recitation_plays in "lifetime meta counters" —
		// only the durable counter keeps it alive under period=all.
		expect(byId.get("alnufais")).toBe(1);

		for (let i = 1; i < body.recitations.length; i++) {
			expect(body.recitations[i - 1].plays).toBeGreaterThanOrEqual(
				body.recitations[i].plays,
			);
		}
	});

	test("accepts period=day/week/year", async () => {
		for (const period of ["day", "week", "year"]) {
			const res = await getRecitationsRoute(adminHeaders, period);
			expect(res.status).toBe(200);
			const body = await res.json();
			expect(body.period).toBe(period);
		}
	});
});

describe("/stats/quran-downloads", () => {
	test("defaults to month, lists every known version with tracked counts, sorted desc", async () => {
		const res = await getQuranDownloadsRoute();
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.period).toBe("month");
		expect(body.downloads.length).toBeGreaterThanOrEqual(EDITION_IDS.size);

		const byVersion = new Map<string, number>(
			body.downloads.map((d: { version: string; downloads: number }) => [
				d.version,
				d.downloads,
			]),
		);

		for (const version of EDITION_IDS) {
			expect(byVersion.has(version)).toBe(true);
		}

		for (const [version, downloads] of downloadCounts) {
			expect(byVersion.get(version)).toBe(downloads);
		}

		for (let i = 1; i < body.downloads.length; i++) {
			expect(body.downloads[i - 1].downloads).toBeGreaterThanOrEqual(
				body.downloads[i].downloads,
			);
		}
	});

	test("period=all returns lifetime counts, unaffected by the v1 row swept from raw rows", async () => {
		const res = await getQuranDownloadsRoute(adminHeaders, "all");
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.period).toBe("all");
		expect(body.downloads.length).toBeGreaterThanOrEqual(EDITION_IDS.size);

		const byVersion = new Map<string, number>(
			body.downloads.map((d: { version: string; downloads: number }) => [
				d.version,
				d.downloads,
			]),
		);

		for (const version of EDITION_IDS) {
			expect(byVersion.has(version)).toBe(true);
		}

		// Lifetime total matches the tracked count exactly — the download
		// recorded then swept from quran_downloads in "lifetime meta counters"
		// is already folded into downloadCounts.
		expect(byVersion.get("v1")).toBe(downloadCounts.get("v1") ?? 0);

		for (let i = 1; i < body.downloads.length; i++) {
			expect(body.downloads[i - 1].downloads).toBeGreaterThanOrEqual(
				body.downloads[i].downloads,
			);
		}
	});

	test("accepts period=day/week/year", async () => {
		for (const period of ["day", "week", "year"]) {
			const res = await getQuranDownloadsRoute(adminHeaders, period);
			expect(res.status).toBe(200);
			const body = await res.json();
			expect(body.period).toBe(period);
		}
	});
});

describe("intrusion attempts", () => {
	test("counts probe paths, ignores legitimate traffic", () => {
		const before = StatsService.getSummary("24h").intrusionAttempts;
		for (const endpoint of [
			"/.env",
			"/.git/config",
			"/wp-admin/setup-config.php",
			"/vendor/phpunit/eval-stdin.php",
		]) {
			record({ endpoint, method: "GET", statusCode: 404, responseTimeMs: 1 });
		}
		record({
			endpoint: "/v3/prayers/timings",
			method: "GET",
			statusCode: 200,
			responseTimeMs: 8,
		});

		expect(StatsService.getSummary("24h").intrusionAttempts).toBe(before + 4);
	});
});

describe("per-module request buckets", () => {
	test("flush buckets known modules by day and skips junk endpoints", () => {
		const svc = StatsService as unknown as { db: Database };
		const today = new Date().toISOString().slice(0, 10);

		const before = svc.db
			.query<{ count: number }, [string]>(
				"SELECT count FROM stats_daily WHERE day = ? AND key = 'requests:athkar'",
			)
			.get(today);

		for (let i = 0; i < 3; i++) {
			StatsService.record({
				endpoint: "/v3/athkar/list",
				method: "GET",
				statusCode: 200,
				responseTimeMs: 5,
			});
		}
		// No module — must not produce a bucket of its own.
		StatsService.record({
			endpoint: "/health",
			method: "GET",
			statusCode: 200,
			responseTimeMs: 1,
		});
		StatsService.flush();

		const after = svc.db
			.query<{ count: number }, [string]>(
				"SELECT count FROM stats_daily WHERE day = ? AND key = 'requests:athkar'",
			)
			.get(today);
		expect(after?.count).toBe((before?.count ?? 0) + 3);

		const junk = svc.db
			.query<{ c: number }, []>(
				"SELECT COUNT(*) as c FROM stats_daily WHERE key = 'requests:health'",
			)
			.get();
		expect(junk?.c).toBe(0);
	});

	test("getRequestsByModule 0-fills every known module, sorted desc", () => {
		const rows = StatsService.getRequestsByModule("all");
		const byModule = new Map(rows.map((r) => [r.module, r.requests]));

		for (const module of [
			"prayers",
			"quran",
			"athkar",
			"locations",
			"feedback",
		]) {
			expect(byModule.has(module)).toBe(true);
		}
		expect(byModule.get("athkar")).toBeGreaterThan(0);

		for (let i = 1; i < rows.length; i++) {
			expect(rows[i - 1].requests).toBeGreaterThanOrEqual(rows[i].requests);
		}
	});
});

describe("stats_meta holds only scalars", () => {
	test("flush no longer writes per-id keys, so buckets are the sole source", () => {
		const svc = StatsService as unknown as { db: Database };

		StatsService.recordPlay("abdullah-khayat");
		StatsService.recordDownload("v1");
		StatsService.flush();
		trackPlay("abdullah-khayat", 1);
		trackDownload("v1", 1);

		const perId = svc.db
			.query<{ c: number }, []>(
				"SELECT COUNT(*) as c FROM stats_meta WHERE key LIKE 'plays:%' OR key LIKE 'downloads:%'",
			)
			.get();
		expect(perId?.c).toBe(0);

		// The scalars are the part that genuinely can't be derived.
		const scalars = svc.db
			.query<{ key: string }, []>("SELECT key FROM stats_meta ORDER BY key")
			.all()
			.map((r) => r.key);
		expect(scalars).toEqual([
			"total_downloads",
			"total_plays",
			"total_requests",
		]);
	});
});

describe("/stats/requests", () => {
	test("401 without the admin key", async () => {
		const res = await getRequestsRoute({});
		expect(res.status).toBe(401);
	});

	test("defaults to month and lists every known module", async () => {
		const res = await getRequestsRoute();
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.period).toBe("month");

		const modules = body.requests.map((r: { module: string }) => r.module);
		for (const module of [
			"prayers",
			"quran",
			"athkar",
			"locations",
			"feedback",
		]) {
			expect(modules).toContain(module);
		}
	});

	test("accepts every counter period", async () => {
		for (const period of ["day", "week", "month", "year", "all"]) {
			const res = await getRequestsRoute(adminHeaders, period);
			expect(res.status).toBe(200);
			expect((await res.json()).period).toBe(period);
		}
	});
});
