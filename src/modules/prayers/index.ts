import { Elysia } from "elysia";

import { PrayersService } from "@/modules/prayers/prayer.service";

import {
	AdapterListResponse,
	PrayerTimesQuery,
	PrayerTimesResponse,
} from "@/modules/prayers/prayers.schemas";

export const prayerModule = new Elysia({
	name: "prayerModule",
	prefix: "/prayers",
	detail: {
		tags: ["Prayers"],
	},
})
	.get(
		"/",
		({ query }) => {
			const { lat, lng, year, month, provider, ...options } = query;
			return PrayersService.getPrayerTimes({
				lat,
				lng,
				year,
				month,
				provider,
				options: Object.keys(options).length ? options : undefined,
			});
		},
		{
			query: PrayerTimesQuery,
			response: PrayerTimesResponse,
		},
	)

	.get("/providers", () => PrayersService.getProviders(), {
		response: AdapterListResponse,
	});
