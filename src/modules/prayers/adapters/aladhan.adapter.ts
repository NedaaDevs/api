import { env } from "@/config/env";
import {
	type AdapterMeta,
	type MonthlyPrayerTimes,
	PrayerTimesAdapter,
	type PrayerTimesParams,
	type PrayerTimesResult,
} from "@/modules/prayers/adapters/base.adapter";
import { ValidationError } from "@/shared/errors";

/**
 * Valid calculation methods for Aladhan API
 * @see https://aladhan.com/prayer-times-api
 *
 * - 0: Jafari / Shia Ithna-Ashari
 * - 1: University of Islamic Sciences, Karachi
 * - 2: Islamic Society of North America (ISNA)
 * - 3: Muslim World League
 * - 4: Umm Al-Qura University, Makkah
 * - 5: Egyptian General Authority of Survey
 * - 7: Institute of Geophysics, University of Tehran
 * - 8: Gulf Region
 * - 9: Kuwait
 * - 10: Qatar
 * - 11: Majlis Ugama Islam Singapura, Singapore
 * - 12: Union Organization Islamic de France
 * - 13: Diyanet İşleri Başkanlığı, Turkey
 * - 14: Spiritual Administration of Muslims of Russia
 * - 15: Moonsighting Committee Worldwide (requires shafaq param)
 * - 16: Dubai (experimental)
 * - 17: Jabatan Kemajuan Islam Malaysia (JAKIM)
 * - 18: Tunisia
 * - 19: Algeria
 * - 20: KEMENAG - Kementerian Agama Republik Indonesia
 * - 21: Morocco
 * - 22: Comunidade Islamica de Lisboa
 * - 23: Ministry of Awqaf, Islamic Affairs and Holy Places, Jordan
 * - 99: Custom (see https://aladhan.com/calculation-methods)
 */
const VALID_METHODS = [
	0, 1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22,
	23, 99,
] as const;

/**
 * Shafaq values for Moonsighting Committee method (method 15)
 * - general: General shafaq
 * - ahmer: Red shafaq
 * - abyad: White shafaq
 */
const VALID_SHAFAQ = ["general", "ahmer", "abyad"] as const;

export const meta: AdapterMeta = {
	id: "aladhan",
	name: "Aladhan",
	website: "https://aladhan.com",
	description: "Islamic prayer times API with multiple calculation methods",
	supportedParams: [
		"method",
		"school",
		"midnightMode",
		"shafaq",
		"latitudeAdjustmentMethod",
		"tune",
		"adjustment",
		"timezonestring",
	],
};

interface AladhanOptions {
	method?: number;
	school?: number;
	midnightMode?: number;
	shafaq?: (typeof VALID_SHAFAQ)[number];
	latitudeAdjustmentMethod?: number;
	tune?: string;
	adjustment?: number;
	timezonestring?: string;
}

export default class AladhanAdapter extends PrayerTimesAdapter {
	readonly meta = meta;

	async getPrayerTimes(params: PrayerTimesParams): Promise<PrayerTimesResult> {
		const options = this.validateOptions(params.options);
		const response = await this.fetch<AladhanCalendarResponse>(
			`${env.ALADHAN_API_URL}/v1/calendar`,
			{
				latitude: params.lat,
				longitude: params.lng,
				iso8601: true,
				annual: true,
				method: options.method ?? 2,
				school: options.school ?? 0,
				...(params.year && { year: params.year }),
				...(params.month && { month: params.month }),
				...(options.midnightMode !== undefined && {
					midnightMode: options.midnightMode,
				}),
				...(options.shafaq && { shafaq: options.shafaq }),
				...(options.latitudeAdjustmentMethod !== undefined && {
					latitudeAdjustmentMethod: options.latitudeAdjustmentMethod,
				}),
				...(options.tune && { tune: options.tune }),
				...(options.adjustment !== undefined && {
					adjustment: options.adjustment,
				}),
				...(options.timezonestring && {
					timezonestring: options.timezonestring,
				}),
			},
		);

		return this.mapToInternal(response, params);
	}

	protected validateOptions(raw?: Record<string, unknown>): AladhanOptions {
		const opts = (raw ?? {}) as AladhanOptions;

		if (
			opts.method !== undefined &&
			!VALID_METHODS.includes(opts.method as (typeof VALID_METHODS)[number])
		) {
			throw new ValidationError(
				`method must be one of: ${VALID_METHODS.join(", ")}`,
			);
		}

		if (opts.school !== undefined && ![0, 1].includes(opts.school)) {
			throw new ValidationError("school must be 0 (Shafi) or 1 (Hanafi)");
		}

		if (
			opts.midnightMode !== undefined &&
			![0, 1].includes(opts.midnightMode)
		) {
			throw new ValidationError(
				"midnightMode must be 0 (Standard) or 1 (Jafari)",
			);
		}

		if (opts.shafaq && !VALID_SHAFAQ.includes(opts.shafaq)) {
			throw new ValidationError("shafaq must be general, ahmer, or abyad");
		}

		// shafaq only valid with method 15 (Moonsighting Committee)
		if (opts.shafaq && opts.method !== 15) {
			throw new ValidationError(
				"shafaq is only valid when method is 15 (Moonsighting Committee)",
			);
		}

		if (
			opts.latitudeAdjustmentMethod !== undefined &&
			![1, 2, 3].includes(opts.latitudeAdjustmentMethod)
		) {
			throw new ValidationError(
				"latitudeAdjustmentMethod must be 1 (Middle of Night), 2 (One Seventh), or 3 (Angle Based)",
			);
		}

		// Validate tune format: 9 comma-separated integers
		if (opts.tune) {
			const parts = opts.tune.split(",");
			if (parts.length !== 9 || !parts.every((p) => /^-?\d+$/.test(p.trim()))) {
				throw new ValidationError(
					"tune must be 9 comma-separated integers (Imsak,Fajr,Sunrise,Dhuhr,Asr,Maghrib,Sunset,Isha,Midnight)",
				);
			}
		}

		return opts;
	}

	private mapToInternal(
		response: AladhanCalendarResponse,
		params: PrayerTimesParams,
	): PrayerTimesResult {
		const data = response.data;
		const firstMonth = Object.keys(data)[0];
		const timezone = data[firstMonth][0].meta.timezone;
		const months: MonthlyPrayerTimes = {};
		for (const [month, days] of Object.entries(data)) {
			months[month] = days.map((day) => ({
				date: String(day.date.timestamp),
				timings: {
					fajr: day.timings.Fajr,
					sunrise: day.timings.Sunrise,
					dhuhr: day.timings.Dhuhr,
					asr: day.timings.Asr,
					sunset: day.timings.Sunset,
					maghrib: day.timings.Maghrib,
					isha: day.timings.Isha,
					imsak: day.timings.Imsak,
					midnight: day.timings.Midnight,
					firstthird: day.timings.Firstthird,
					lastthird: day.timings.Lastthird,
				},
			}));
		}

		return {
			timezone,
			coordinates: { lat: params.lat, lng: params.lng },
			provider: this.meta.id,
			months,
		};
	}
}

interface AladhanDayData {
	timings: {
		Fajr: string;
		Sunrise: string;
		Dhuhr: string;
		Asr: string;
		Sunset: string;
		Maghrib: string;
		Isha: string;
		Imsak: string;
		Midnight: string;
		Firstthird: string;
		Lastthird: string;
	};
	date: {
		timestamp: number;
	};
	meta: {
		timezone: string;
	};
}

interface AladhanCalendarResponse {
	data: {
		[month: string]: AladhanDayData[];
	};
}
