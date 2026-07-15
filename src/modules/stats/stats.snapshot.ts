import { S3Client } from "bun";
import { env } from "@/config/env";
import { audio } from "@/modules/quran/quran.audio";
import { type Period, StatsService } from "@/modules/stats/stats.service";

const FIRST_RUN_DELAY_MS = 30_000;
const RUN_INTERVAL_MS = 3_600_000;
const SNAPSHOT_KEY = "stats.json";
const PERIODS = ["24h", "7d", "30d"] satisfies Period[];

// Published only — the page must not advertise staged recitations users can't
// see in the app yet.
const PUBLISHED_IDS = new Set(
	audio.reciters.flatMap((r) =>
		r.recitations.filter((rec) => rec.published).map((rec) => rec.id),
	),
);

const buildCatalog = () => {
	let reciters = 0;
	let recitations = 0;
	let audioBytes = 0;
	for (const reciter of audio.reciters) {
		const published = reciter.recitations.filter((rec) => rec.published);
		if (published.length === 0) continue;
		reciters += 1;
		recitations += published.length;
		for (const recitation of published) {
			audioBytes += recitation.bytesApprox;
			// Ayah-granularity recitations also ship a per-surah ZIP bundle (reader
			// mode) alongside the mp3s; mp3s don't compress, so the zip is ~equal
			// in size to the mp3 bytes already counted above.
			if (recitation.granularity === "ayah") {
				audioBytes += recitation.bytesApprox;
			}
		}
	}
	return {
		reciters,
		recitations,
		audioGB: Number((audioBytes / 1024 ** 3).toFixed(1)),
	};
};

const buildPayload = () => {
	const periods = {} as Record<
		Period,
		{ requests: number; availabilityPct: number; p50Ms: number; p95Ms: number }
	>;
	for (const period of PERIODS) {
		const summary = StatsService.getSummary(period);
		periods[period] = {
			requests: summary.totalRequests,
			// serverErrorRate is 0 (not NaN) when totalRequests is 0, so this
			// naturally lands on 100 with zero traffic.
			availabilityPct: Number((100 * (1 - summary.serverErrorRate)).toFixed(3)),
			p50Ms: summary.p50Ms,
			p95Ms: summary.p95Ms,
		};
	}

	const topRecitations = StatsService.getRecitationPlays("30d")
		.filter((r) => r.plays > 0 && PUBLISHED_IDS.has(r.recitationId))
		.sort((a, b) => b.plays - a.plays)
		.slice(0, 5);

	const monthly = StatsService.getSummary("30d");

	return {
		generatedAt: new Date().toISOString(),
		periods,
		lifetimeRequests: StatsService.getLifetimeRequests(),
		catalog: buildCatalog(),
		topRecitations,
		// Counts only — no latency/error data goes public.
		requestsByModule: Object.fromEntries(
			monthly.modules.map((m) => [m.module, m.count]),
		),
		intrusionAttempts: monthly.intrusionAttempts,
	};
};

export const startStatsSnapshot = (): (() => void) => {
	const {
		STATS_S3_ENDPOINT: endpoint,
		STATS_S3_ACCESS_KEY_ID: accessKeyId,
		STATS_S3_SECRET_ACCESS_KEY: secretAccessKey,
		STATS_S3_BUCKET_NAME: bucket,
	} = env;

	if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) {
		console.log("[stats] snapshot disabled (STATS_S3_* not configured)");
		return () => {};
	}

	const client = new S3Client({
		accessKeyId,
		secretAccessKey,
		endpoint,
		bucket,
	});

	const run = async () => {
		try {
			const payload = buildPayload();
			await client.file(SNAPSHOT_KEY).write(JSON.stringify(payload), {
				type: "application/json",
			});
		} catch (err) {
			// A stale public file is fine, a crashed API is not.
			console.error("[stats] snapshot failed:", err);
		}
	};

	let interval: Timer | undefined;
	const timeout: Timer = setTimeout(() => {
		run();
		interval = setInterval(run, RUN_INTERVAL_MS);
	}, FIRST_RUN_DELAY_MS);

	return () => {
		clearTimeout(timeout);
		if (interval) clearInterval(interval);
	};
};
