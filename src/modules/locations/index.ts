import { Elysia } from "elysia";
import {
	ReverseGeocodeQuery,
	ReverseGeocodeResponse,
} from "@/modules/locations/locations.schemas";
import { LocationsService } from "@/modules/locations/locations.service";
import { locationRateLimit } from "@/shared/plugins/rate-limiter";

export const locationsModule = new Elysia({
	name: "Locations",
	prefix: "/locations",
	detail: {
		tags: ["Locations"],
	},
})
	.use(locationRateLimit)
	.get(
		"/reverse-geocode",
		({ query }) => LocationsService.reverseGeocode(query),
		{
			response: ReverseGeocodeResponse,
			query: ReverseGeocodeQuery,
		},
	);
