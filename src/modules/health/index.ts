import { Elysia, t } from "elysia";
import { env } from "@/config/env";
import { locationCache, prayerTimesCache } from "@/shared/services/cache";

const isDev = env.NODE_ENV === "development";

const cacheTypeSchema = t.Object({
	size: t.Number(),
	hits: t.Number(),
	misses: t.Number(),
	hitRate: t.Number(),
});

const healthSchema = t.Object({
	status: t.String(),
	timestamp: t.String(),
	cache: t.Optional(
		t.Object({
			prayerTimes: cacheTypeSchema,
			location: cacheTypeSchema,
		}),
	),
});

const getHealth = () => ({
	status: "ok",
	timestamp: new Date().toISOString(),
	isDev,
	cache: isDev
		? {
				prayerTimes: prayerTimesCache.getStats(),
				location: locationCache.getStats(),
			}
		: undefined,
});

export const healthModule = new Elysia({
	name: "health",
	prefix: "/health",
	detail: {
		tags: ["Health"],
	},
}).get("/", getHealth, {
	response: healthSchema,
});
