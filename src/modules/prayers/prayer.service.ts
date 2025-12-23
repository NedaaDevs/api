import type {
	AdapterMeta,
	PrayerTimesParams,
	PrayerTimesResult,
} from "@/modules/prayers/adapters/base.adapter";
import {
	getAdapter,
	getDefaultAdapter,
	listAdapters,
} from "@/modules/prayers/adapters/registry";

import { createCacheKey, prayerTimesCache } from "@/shared/services/cache";

// biome-ignore lint/complexity/noStaticOnlyClass: <explanation>
export abstract class PrayersService {
	static getProviders(): AdapterMeta[] {
		return listAdapters();
	}

	static async getPrayerTimes(
		params: PrayerTimesParams,
	): Promise<PrayerTimesResult> {
		const cacheKey = createCacheKey("prayers", params.lat, params.lng, {
			provider: params.provider ?? "aladhan",
			...params.options,
		});

		// Check cache first
		const cached = prayerTimesCache.get(cacheKey);
		if (cached) return cached as PrayerTimesResult; // Hit return

		const adapter = params.provider
			? getAdapter(params.provider)
			: getDefaultAdapter();

		const result = await adapter.getPrayerTimes(params);

		// Cache result
		prayerTimesCache.set(cacheKey, result);

		return result;
	}
}
