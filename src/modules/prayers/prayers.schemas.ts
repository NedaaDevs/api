import { t } from "elysia";

// GET /prayers query params
export const PrayerTimesQuery = t.Object({
	lat: t.Number({
		minimum: -90,
		maximum: 90,
	}),
	lng: t.Number({ minimum: -180, maximum: 180 }),
	date: t.Optional(t.String({ format: "date" })),
	provider: t.Optional(t.String()),
	options: t.Optional(t.Record(t.String(), t.Union([t.String(), t.Number()]))),
});

// Single prayer time
const PrayerTimeSchema = t.Object({
	name: t.String(),
	time: t.String(),
});

// GET /prayers response
export const PrayerTimesResponse = t.Object({
	date: t.String(),
	coordinates: t.Object({
		lat: t.Number(),
		lng: t.Number(),
	}),
	timezone: t.String(),
	provider: t.String(),
	prayers: t.Array(PrayerTimeSchema),
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
