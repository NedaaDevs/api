import { Elysia } from "elysia";
import { env } from "@/config/env";
import {
	StatsPeriodQuery,
	StatsSummaryResponse,
} from "@/modules/stats/stats.schemas";
import { StatsService } from "@/modules/stats/stats.service";
import { AppError, CODES } from "@/shared/errors";

export const statsModule = new Elysia({
	name: "statsModule",
	prefix: "/stats",
	detail: {
		tags: ["Stats"],
	},
}).get(
	"/summary",
	({ query }) => StatsService.getSummary(query.period ?? "24h"),
	{
		query: StatsPeriodQuery,
		response: StatsSummaryResponse,
		beforeHandle({ headers }) {
			const origin = headers.origin ?? "";
			const isNedaa =
				origin === "https://nedaa.dev" || origin === "https://www.nedaa.dev";
			const isAdmin = headers["x-admin-key"] === env.ADMIN_API_KEY;

			if (!isNedaa && !isAdmin) {
				throw new AppError("Unauthorized", 401, CODES.UNAUTHORIZED);
			}
		},
	},
);
