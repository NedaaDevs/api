import { S3Client } from "bun";
import { env } from "@/config/env";
import { audio } from "@/modules/quran/quran.audio";
import {
	COUNTER_PERIODS,
	type CounterPeriod,
	type Period,
	StatsService,
} from "@/modules/stats/stats.service";

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

// Display names for the public top list. Consumers get localised names rather
// than having to reverse-engineer them from the slug — the names live here, so
// this is where they should be resolved.
const RECITATION_META = new Map(
	audio.reciters.flatMap((r) =>
		r.recitations.map((rec) => [
			rec.id,
			{ nameEn: r.nameEnglish, nameAr: r.nameArabic, style: rec.style },
		]),
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

	// Lifetime ("all" — durable per-id counters, unaffected by the 90-day
	// raw-row sweep) ranks each list; every entry also carries every other
	// counter window (day/week/month/year) as a trend signal.
	const zeroWindows: Record<CounterPeriod, number> = {
		day: 0,
		week: 0,
		month: 0,
		year: 0,
		all: 0,
	};

	// Published-only, top 5.
	const playWindows = new Map<string, Record<CounterPeriod, number>>();
	for (const period of COUNTER_PERIODS) {
		for (const { recitationId, plays } of StatsService.getRecitationPlays(
			period,
		)) {
			const windows = playWindows.get(recitationId) ?? { ...zeroWindows };
			windows[period] = plays;
			playWindows.set(recitationId, windows);
		}
	}
	const topRecitations = [...playWindows.entries()]
		.filter(([recitationId, w]) => w.all > 0 && PUBLISHED_IDS.has(recitationId))
		.sort((a, b) => b[1].all - a[1].all)
		.slice(0, 5)
		.map(([recitationId, plays]) => {
			const meta = RECITATION_META.get(recitationId);
			return {
				recitationId,
				// Falling back to the slug keeps the field present even for an id
				// that outlives its catalogue entry.
				nameEn: meta?.nameEn ?? recitationId,
				nameAr: meta?.nameAr ?? recitationId,
				style: meta?.style ?? "",
				plays,
			};
		});

	// All editions 0-filled (via the "all" window) — the edition set is tiny
	// and fixed.
	const downloadWindows = new Map<string, Record<CounterPeriod, number>>();
	for (const period of COUNTER_PERIODS) {
		for (const { version, downloads } of StatsService.getQuranDownloads(
			period,
		)) {
			const windows = downloadWindows.get(version) ?? { ...zeroWindows };
			windows[period] = downloads;
			downloadWindows.set(version, windows);
		}
	}
	const editionDownloads = [...downloadWindows.entries()]
		.sort((a, b) => b[1].all - a[1].all)
		.map(([version, downloads]) => ({ version, downloads }));

	const monthly = StatsService.getSummary("30d");

	return {
		generatedAt: new Date().toISOString(),
		periods,
		lifetimeRequests: StatsService.getLifetimeRequests(),
		catalog: buildCatalog(),
		topRecitations,
		editionDownloads,
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
