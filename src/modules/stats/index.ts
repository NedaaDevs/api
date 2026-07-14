import { createHash, timingSafeEqual } from "node:crypto";
import { Elysia } from "elysia";
import { env } from "@/config/env";
import { RECITATION_IDS } from "@/modules/quran/quran.audio";
import {
	StatsPeriodQuery,
	StatsRecitationsQuery,
	StatsRecitationsResponse,
	StatsSummaryResponse,
} from "@/modules/stats/stats.schemas";
import { StatsService } from "@/modules/stats/stats.service";
import { AppError, CODES } from "@/shared/errors";

// Hashing both sides gives equal-length buffers, so the comparison is
// constant-time regardless of what the client sends.
const digest = (value: string) => createHash("sha256").update(value).digest();

export const isAdmin = (
	headers: Record<string, string | undefined>,
	key: string | undefined,
): boolean => {
	const supplied = headers["x-admin-key"];
	if (!key || !supplied) return false;
	return timingSafeEqual(digest(supplied), digest(key));
};

export const statsModule = new Elysia({
	name: "statsModule",
	prefix: "/stats",
	detail: {
		tags: ["Stats"],
	},
})
	.model({
		"Stats.PeriodQuery": StatsPeriodQuery,
		"Stats.Summary": StatsSummaryResponse,
		"Stats.RecitationsQuery": StatsRecitationsQuery,
		"Stats.Recitations": StatsRecitationsResponse,
	})
	.get(
		"/summary",
		({ query }) => StatsService.getSummary(query.period ?? "24h"),
		{
			query: "Stats.PeriodQuery",
			response: "Stats.Summary",
			beforeHandle({ headers }) {
				if (!isAdmin(headers, env.ADMIN_API_KEY)) {
					throw new AppError("Unauthorized", 401, CODES.UNAUTHORIZED);
				}
			},
		},
	)
	.get(
		"/recitations",
		({ query }) => {
			const period = query.period ?? "30d";
			const plays = StatsService.getRecitationPlays(period);
			const playsById = new Map(plays.map((p) => [p.recitationId, p.plays]));

			const recitations = [...RECITATION_IDS].map((recitationId) => ({
				recitationId,
				plays: playsById.get(recitationId) ?? 0,
			}));
			for (const p of plays) {
				if (!RECITATION_IDS.has(p.recitationId)) recitations.push(p);
			}

			recitations.sort(
				(a, b) =>
					b.plays - a.plays || a.recitationId.localeCompare(b.recitationId),
			);

			return { period, recitations };
		},
		{
			query: "Stats.RecitationsQuery",
			response: "Stats.Recitations",
			beforeHandle({ headers }) {
				if (!isAdmin(headers, env.ADMIN_API_KEY)) {
					throw new AppError("Unauthorized", 401, CODES.UNAUTHORIZED);
				}
			},
		},
	);
