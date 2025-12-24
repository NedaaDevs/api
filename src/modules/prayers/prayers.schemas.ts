import { t } from "elysia";

// GET /prayers query params
export const PrayerTimesQuery = t.Object({
	lat: t.Number({
		minimum: -90,
		maximum: 90,
	}),
	lng: t.Number({ minimum: -180, maximum: 180 }),
	year: t.Optional(t.Number()),
	month: t.Optional(t.Number({ minimum: 1, maximum: 12 })),
	provider: t.Optional(t.String()),
	options: t.Optional(t.Any()),
});

// Day timings
export const DayTimingsSchema = t.Object({
	fajr: t.String(),
	sunrise: t.String(),
	dhuhr: t.String(),
	asr: t.String(),
	sunset: t.String(),
	maghrib: t.String(),
	isha: t.String(),
	imsak: t.String(),
	midnight: t.String(),
	firstthird: t.String(),
	lastthird: t.String(),
});

// Single day prayer times
export const DayPrayerTimesSchema = t.Object({
	date: t.String(),
	timings: DayTimingsSchema,
});

// GET /prayers response (annual calendar)
export const PrayerTimesResponse = t.Object({
	timezone: t.String(),
	coordinates: t.Object({
		lat: t.Number(),
		lng: t.Number(),
	}),
	provider: t.String(),
	months: t.Record(t.String(), t.Array(DayPrayerTimesSchema)),
});

// Single adapter info
export const AdapterSchema = t.Object({
	id: t.String(),
	name: t.String(),
	website: t.String(),
	description: t.String(),
	supportedParams: t.Array(t.String()),
});

// GET /prayers/providers response
export const AdapterListResponse = t.Array(AdapterSchema);
