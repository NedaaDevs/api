import { Elysia } from "elysia";
import { RECITATION_IDS } from "@/modules/quran/quran.audio";
import { EDITION_IDS } from "@/modules/quran/quran.editions";
import {
	QuranDownloadBody,
	QuranDownloadResponse,
	QuranManifestResponse,
	QuranPlayBody,
	QuranPlayResponse,
} from "@/modules/quran/quran.schemas";
import { QuranService } from "@/modules/quran/quran.service";
import { StatsService } from "@/modules/stats/stats.service";
import { AppError, CODES, ValidationError } from "@/shared/errors";

// Fixed-window limiter, in-memory only — the IP is never logged or persisted,
// it only ever lives as a key in this map for the current window.
const RATE_LIMIT_WINDOW_MS = 3_600_000;
// Sized for carrier CGNAT, where thousands of subscribers share one public
// address — a per-user ceiling here would 429 whole mobile networks.
export const RATE_LIMIT_MAX = 3_000;
const RATE_LIMIT_MAX_TRACKED_IPS = 100_000;

// cf-connecting-ip first: the proxy sets it and clients can't forge it through
// the edge, whereas x-forwarded-for's first hop is always client-supplied.
const clientIp = (headers: Record<string, string | undefined>): string =>
	headers["cf-connecting-ip"] ??
	headers["x-forwarded-for"]?.split(",").at(-1)?.trim() ??
	"unknown";

// Per-action fixed-window limiter factory — plays and downloads are rate-limited
// independently, each with its own window/hit map.
const makeRateLimiter = (message: string) => {
	let windowStart = Date.now();
	const hits = new Map<string, number>();

	return (ip: string) => {
		const now = Date.now();
		if (now - windowStart > RATE_LIMIT_WINDOW_MS) {
			hits.clear();
			windowStart = now;
		}
		// Bound the map so rotating spoofed identities can't grow it unbounded.
		// Fails open: once full, untracked IPs pass rather than 429: these are
		// fire-and-forget stat beacons, and blocking every new IP for the rest of
		// the window punishes real users to stop counter inflation.
		if (!hits.has(ip) && hits.size >= RATE_LIMIT_MAX_TRACKED_IPS) return;

		const count = (hits.get(ip) ?? 0) + 1;
		hits.set(ip, count);
		if (count > RATE_LIMIT_MAX) {
			throw new AppError(message, 429, CODES.RATE_LIMITED);
		}
	};
};

const LIMITERS = {
	play: makeRateLimiter("Too many play requests"),
	download: makeRateLimiter("Too many download requests"),
} as const;

export const quranModule = new Elysia({
	name: "quranModule",
	prefix: "/quran",
	detail: {
		tags: ["Quran"],
	},
})
	.macro({
		rateLimit: (action: keyof typeof LIMITERS) => ({
			beforeHandle({ headers }) {
				LIMITERS[action](clientIp(headers));
			},
		}),
	})
	.model({
		"Quran.Manifest": QuranManifestResponse,
		"Quran.PlayBody": QuranPlayBody,
		"Quran.PlayResponse": QuranPlayResponse,
		"Quran.DownloadBody": QuranDownloadBody,
		"Quran.DownloadResponse": QuranDownloadResponse,
	})
	.get("/manifest", () => QuranService.getManifest(), {
		response: "Quran.Manifest",
	})
	.post(
		"/plays",
		({ body, status }) => {
			if (!RECITATION_IDS.has(body.recitationId)) {
				throw new ValidationError(`Unknown recitationId: ${body.recitationId}`);
			}

			StatsService.recordPlay(body.recitationId);
			return status(202, { ok: true } as const);
		},
		{
			rateLimit: "play",
			body: "Quran.PlayBody",
			response: { 202: "Quran.PlayResponse" },
		},
	)
	.post(
		"/downloads",
		({ body, status }) => {
			if (!EDITION_IDS.has(body.version)) {
				throw new ValidationError(`Unknown version: ${body.version}`);
			}

			StatsService.recordDownload(body.version);
			return status(202, { ok: true } as const);
		},
		{
			rateLimit: "download",
			body: "Quran.DownloadBody",
			response: { 202: "Quran.DownloadResponse" },
		},
	);
