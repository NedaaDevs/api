import { Elysia } from "elysia";
import { StatsService } from "@/modules/stats/stats.service";

const EXCLUDED_PREFIXES = ["/docs", "/v3/stats"];

export const statsCollector = new Elysia({ name: "statsCollector" })
	.derive({ as: "global" }, () => ({
		requestStartTime: performance.now(),
	}))
	.onAfterResponse(
		{ as: "global" },
		({ requestStartTime, request, path, set }) => {
			if (EXCLUDED_PREFIXES.some((p) => path.startsWith(p))) return;

			const responseTimeMs = requestStartTime
				? Math.round(performance.now() - requestStartTime)
				: 0;

			StatsService.record({
				endpoint: path,
				method: request.method,
				statusCode: typeof set.status === "number" ? set.status : 200,
				responseTimeMs,
			});
		},
	);
