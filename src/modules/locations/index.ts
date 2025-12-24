import { Elysia } from "elysia";
import {
	ReverseGeocodeQuery,
	ReverseGeocodeResponse,
} from "@/modules/locations/locations.schemas";
import { LocationsService } from "@/modules/locations/locations.service";

export const locationsModule = new Elysia({
	name: "Locations",
	prefix: "/locations",
	detail: {
		tags: ["Locations"],
	},
}).get(
	"/reverse-geocode",
	({ query }) => LocationsService.reverseGeocode(query),
	{
		response: ReverseGeocodeResponse,
		query: ReverseGeocodeQuery,
	},
);
