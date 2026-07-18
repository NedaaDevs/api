import { createHash, timingSafeEqual } from "node:crypto";
import { Elysia } from "elysia";
import { env } from "@/config/env";
import {
	StatsPeriodQuery,
	StatsQuranDownloadsQuery,
	StatsQuranDownloadsResponse,
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
	.macro({
		admin: {
			beforeHandle({ headers }) {
				if (!isAdmin(headers, env.ADMIN_API_KEY)) {
					throw new AppError("Unauthorized", 401, CODES.UNAUTHORIZED);
				}
			},
		},
	})
	.model({
		"Stats.PeriodQuery": StatsPeriodQuery,
		"Stats.Summary": StatsSummaryResponse,
		"Stats.RecitationsQuery": StatsRecitationsQuery,
		"Stats.Recitations": StatsRecitationsResponse,
		"Stats.QuranDownloadsQuery": StatsQuranDownloadsQuery,
		"Stats.QuranDownloads": StatsQuranDownloadsResponse,
	})
	.get(
		"/summary",
		({ query }) => StatsService.getSummary(query.period ?? "24h"),
		{
			admin: true,
			query: "Stats.PeriodQuery",
			response: "Stats.Summary",
		},
	)
	.get(
		"/recitations",
		({ query }) => ({
			period: query.period,
			recitations: StatsService.getRecitationPlays(query.period),
		}),
		{
			admin: true,
			query: "Stats.RecitationsQuery",
			response: "Stats.Recitations",
		},
	)
	.get(
		"/quran-downloads",
		({ query }) => ({
			period: query.period,
			downloads: StatsService.getQuranDownloads(query.period),
		}),
		{
			admin: true,
			query: "Stats.QuranDownloadsQuery",
			response: "Stats.QuranDownloads",
		},
	);
