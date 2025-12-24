import { env } from "@/config/env";
import { createCacheKey, locationCache } from "@/shared/services/cache";

interface ReverseGeocodeParams {
	lat: number;
	lng: number;
	locale: "ar" | "en" | "ur" | "ms";
}

interface ReverseGeocodeResult {
	countryName: string;
	city: string;
	timezone: string;
}

interface BDCResponse {
	countryName: string;
	city: string;
	timeZone: {
		ianaTimeId: string;
	};
}

// biome-ignore lint/complexity/noStaticOnlyClass: Elysia pattern
export abstract class LocationsService {
	private static readonly API_PATH = "/data/reverse-geocode-with-timezone";

	static async reverseGeocode(
		params: ReverseGeocodeParams,
	): Promise<ReverseGeocodeResult> {
		// Check cache
		const cacheKey = createCacheKey("location", params.lat, params.lng, {
			locale: params.locale,
		});
		const cached = locationCache.get(cacheKey);
		if (cached) return cached as ReverseGeocodeResult;

		// Call BigDataCloud API
		const url = new URL(`${env.BDC_API_URL}${LocationsService.API_PATH}`);
		url.searchParams.set("latitude", String(params.lat));
		url.searchParams.set("longitude", String(params.lng));
		url.searchParams.set("localityLanguage", params.locale);
		url.searchParams.set("key", env.BDC_API_KEY);

		const response = await fetch(url, {
			signal: AbortSignal.timeout(10000),
		});

		if (!response.ok) {
			throw new Error(`BigDataCloud API error: ${response.status}`);
		}

		const data: BDCResponse = await response.json();

		const result: ReverseGeocodeResult = {
			countryName: data.countryName,
			city: data.city,
			timezone: data.timeZone.ianaTimeId,
		};

		// Cache result
		locationCache.set(cacheKey, result);

		return result;
	}
}
