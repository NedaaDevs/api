import type { Database } from "bun:sqlite";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { Elysia } from "elysia";
import { env } from "@/config/env";
import { quranModule } from "@/modules/quran";
import { RECITATION_IDS } from "@/modules/quran/quran.audio";
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

const getRecitationsRoute = (headers: Record<string, string> = adminHeaders) =>
	statsApp.handle(
		new Request("http://localhost/stats/recitations", { headers }),
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

		expect(afterLifetime).toBeGreaterThanOrEqual(beforeLifetime);
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

		const plays = StatsService.getRecitationPlays("24h");
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

	test("429 after 60 requests/hour from the same IP", async () => {
		const ip = "10.20.0.3";
		const id = "khalid-al-jalil";
		for (let i = 0; i < 60; i++) {
			const res = await postPlay(id, ip);
			expect(res.status).toBe(202);
		}
		trackPlay(id, 60);

		const blocked = await postPlay(id, ip);
		expect(blocked.status).toBe(429);
	});
});

describe("/stats/recitations", () => {
	test("defaults to 30d, lists every known id with tracked counts, sorted desc", async () => {
		const res = await getRecitationsRoute();
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.period).toBe("30d");
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
