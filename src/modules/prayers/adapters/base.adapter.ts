import { AppError, CODES } from "@/shared/errors";

// Adapter-specific error
export class ProviderError extends AppError {
	constructor(providerId: string, message: string) {
		super(
			`Provider '${providerId}' error: ${message}`,
			502,
			CODES.PROVIDER_ERROR,
		);
	}
}

export interface AdapterMeta {
	id: string;
	name: string;
	website: string;
	description: string;
	supportedParams: string[];
}

// Base params validated by Elysia at route level
// Provider-specific options validated by each adapter
export interface PrayerTimesParams {
	lat: number;
	lng: number;
	year?: number;
	month?: number;
	provider?: string;
	options?: Record<string, unknown>;
}

export interface DayTimings {
	fajr: string;
	sunrise: string;
	dhuhr: string;
	asr: string;
	sunset: string;
	maghrib: string;
	isha: string;
	imsak: string;
	midnight: string;
	firstthird: string;
	lastthird: string;
}

export interface DayPrayerTimes {
	date: string;
	timings: DayTimings;
}

export interface MonthlyPrayerTimes {
	[month: string]: DayPrayerTimes[];
}

export interface PrayerTimesResult {
	timezone: string;
	coordinates: { lat: number; lng: number };
	provider: string;
	months: MonthlyPrayerTimes;
}

export abstract class PrayerTimesAdapter {
	abstract readonly meta: AdapterMeta;

	abstract getPrayerTimes(
		params: PrayerTimesParams,
	): Promise<PrayerTimesResult>;

	// Each adapter implements its own options validation
	protected abstract validateOptions(
		options?: Record<string, unknown>,
	): unknown;

	// Helper for HTTP requests with timeout and error handling
	protected async fetch<T>(
		url: string,
		params?: Record<string, string | number | boolean>,
	): Promise<T> {
		const searchParams = new URLSearchParams();
		if (params) {
			for (const [key, value] of Object.entries(params)) {
				if (value !== undefined) {
					searchParams.set(key, String(value));
				}
			}
		}

		const fullUrl = params ? `${url}?${searchParams}` : url;

		try {
			const response = await fetch(fullUrl, {
				signal: AbortSignal.timeout(10000),
			});

			if (!response.ok) {
				throw new ProviderError(this.meta.id, `HTTP ${response.status}`);
			}

			return response.json();
		} catch (error) {
			if (error instanceof AppError) throw error;
			throw new ProviderError(
				this.meta.id,
				error instanceof Error ? error.message : "Unknown error",
			);
		}
	}
}
