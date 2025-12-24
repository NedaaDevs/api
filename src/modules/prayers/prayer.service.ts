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
		// Cache key WITHOUT month - always cache full year
		const cacheKey = createCacheKey("prayers", params.lat, params.lng, {
			provider: params.provider ?? "aladhan",
			year: params.year ?? new Date().getFullYear(),
			...params.options,
		});

		let result = prayerTimesCache.get(cacheKey) as
			| PrayerTimesResult
			| undefined;

		if (!result) {
			const adapter = params.provider
				? getAdapter(params.provider)
				: getDefaultAdapter();

			result = await adapter.getPrayerTimes(params);
			prayerTimesCache.set(cacheKey, result);
		}

		// Filter AFTER cache if month specified
		if (params.month) {
			const startMonth = params.month;
			return {
				...result,
				months: Object.fromEntries(
					Object.entries(result.months).filter(
						([m]) => Number(m) >= startMonth,
					),
				),
			};
		}

		return result;
	}
}
