import { Elysia } from "elysia";
import { RECITATION_IDS } from "@/modules/quran/quran.audio";
import {
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
const RATE_LIMIT_MAX = 60;
const RATE_LIMIT_MAX_TRACKED_IPS = 10_000;
let windowStart = Date.now();
const hits = new Map<string, number>();

// cf-connecting-ip first: the proxy sets it and clients can't forge it through
// the edge, whereas x-forwarded-for's first hop is always client-supplied.
const clientIp = (headers: Record<string, string | undefined>): string =>
	headers["cf-connecting-ip"] ??
	headers["x-forwarded-for"]?.split(",").at(-1)?.trim() ??
	"unknown";

const checkPlayRateLimit = (ip: string) => {
	const now = Date.now();
	if (now - windowStart > RATE_LIMIT_WINDOW_MS) {
		hits.clear();
		windowStart = now;
	}
	// Bound the map so rotating spoofed identities can't grow it unbounded.
	if (!hits.has(ip) && hits.size >= RATE_LIMIT_MAX_TRACKED_IPS) {
		throw new AppError("Too many play requests", 429, CODES.RATE_LIMITED);
	}
	const count = (hits.get(ip) ?? 0) + 1;
	hits.set(ip, count);
	if (count > RATE_LIMIT_MAX) {
		throw new AppError("Too many play requests", 429, CODES.RATE_LIMITED);
	}
};

export const quranModule = new Elysia({
	name: "quranModule",
	prefix: "/quran",
	detail: {
		tags: ["Quran"],
	},
})
	.model({
		"Quran.Manifest": QuranManifestResponse,
		"Quran.PlayBody": QuranPlayBody,
		"Quran.PlayResponse": QuranPlayResponse,
	})
	.get("/manifest", () => QuranService.getManifest(), {
		response: "Quran.Manifest",
	})
	.post(
		"/plays",
		({ body, headers, status }) => {
			checkPlayRateLimit(clientIp(headers));

			if (!RECITATION_IDS.has(body.recitationId)) {
				throw new ValidationError(`Unknown recitationId: ${body.recitationId}`);
			}

			StatsService.recordPlay(body.recitationId);
			return status(202, { ok: true } as const);
		},
		{
			body: "Quran.PlayBody",
			response: { 202: "Quran.PlayResponse" },
		},
	);
