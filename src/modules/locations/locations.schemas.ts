import { t } from "elysia";

export const ReverseGeocodeQuery = t.Object({
	lat: t.Number({
		minimum: -90,
		maximum: 90,
	}),
	lng: t.Number({ minimum: -180, maximum: 180 }),
	locale: t.Union([
		t.Literal("ar"),
		t.Literal("en"),
		t.Literal("ur"),
		t.Literal("ms"),
	]),
});

export const ReverseGeocodeResponse = t.Object({
	countryName: t.String(),
	city: t.String(),
	timezone: t.String(),
});
