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
		({ query }) =>
			PrayersService.getPrayerTimes({
				lat: query.lat,
				lng: query.lng,
				year: query.year,
				month: query.month,
				provider: query.provider,
				options: query.options,
			}),
		{
			query: PrayerTimesQuery,
			response: PrayerTimesResponse,
		},
	)

	.get("/providers", () => PrayersService.getProviders(), {
		response: AdapterListResponse,
	});
