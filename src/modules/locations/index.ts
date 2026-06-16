import { Elysia } from "elysia";
import {
	ReverseGeocodeQuery,
	ReverseGeocodeResponse,
} from "@/modules/locations/locations.schemas";
import { LocationsService } from "@/modules/locations/locations.service";
import { locationRateLimit } from "@/shared/plugins/rate-limiter";

export const locationsModule = new Elysia({
	name: "locationsModule",
	prefix: "/locations",
	detail: {
		tags: ["Locations"],
	},
})
	.model({
		"Locations.ReverseGeocodeQuery": ReverseGeocodeQuery,
		"Locations.ReverseGeocode": ReverseGeocodeResponse,
	})
	.use(locationRateLimit)
	.get(
		"/reverse-geocode",
		({ query }) => LocationsService.reverseGeocode(query),
		{
			response: "Locations.ReverseGeocode",
			query: "Locations.ReverseGeocodeQuery",
		},
	);
