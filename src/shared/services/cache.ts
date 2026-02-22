import { CACHE_TTL } from "@/config/constants";

/**
 * Round coordinates to 2 decimal places
 * @param lat
 * @param lng
 * @returns
 */
export const bucketCoordinates = (lat: number, lng: number) => {
	return [Math.round(lat * 100) / 100, Math.round(lng * 100) / 100];
};

export const createCacheKey = (
	prefix: string,
	lat: number,
	lng: number,
	params?: Record<string, string | number>,
): string => {
	const base = `${prefix}:${lat}:${lng}`;

	if (!params || Object.keys(params).length === 0) {
		return base;
	}

	// Sort params for consistent keys (to avoid cache misses for same params in different order)
	const sortedParams = Object.keys(params)
		.sort()
		.map((k) => `${k}=${params[k]}`)
		.join("&");

	return `${base}:${sortedParams}`;
};

interface CacheEntry<T> {
	value: T;
	expiresAt: number;
}

interface CacheStats {
	size: number;
	hits: number;
	misses: number;
	hitRate: number;
}

export class CacheService<T = unknown> {
	private cache = new Map<string, CacheEntry<T>>();
	private stats: CacheStats = {
		size: 0,
		hits: 0,
		misses: 0,
		hitRate: 0,
	};
	private maxSize = 1000;
	private defaultTTL = CACHE_TTL.PRAYER_TIMES;

	constructor(options?: {
		maxSize: number;
		ttl: number;
	}) {
		this.maxSize = options?.maxSize ?? 1000;
		this.defaultTTL = options?.ttl ?? CACHE_TTL.PRAYER_TIMES;
	}

	// TODO: Caching disabled for debugging — re-enable later
	get(_key: string): T | undefined {
		return undefined;
	}

	set(_key: string, _value: T, _ttl?: number): void {}

	has(_key: string): boolean {
		return false;
	}

	delete(key: string): boolean {
		return this.cache.delete(key);
	}

	clear(): void {
		this.cache.clear();
		this.stats = {
			size: 0,
			hits: 0,
			misses: 0,
			hitRate: 0,
		};
	}

	prune(): number {
		let pruned = 0;
		this.cache.forEach((entry, key) => {
			if (Date.now() > entry.expiresAt) {
				this.cache.delete(key);
				pruned++;
			}
		});
		return pruned;
	}

	getStats(): CacheStats {
		const hitRate =
			this.stats.hits / (this.stats.hits + this.stats.misses) || 0;
		return {
			size: this.cache.size,
			hits: this.stats.hits,
			misses: this.stats.misses,
			hitRate: hitRate,
		};
	}
}

// Singleton instances for different cache types
export const prayerTimesCache = new CacheService({
	maxSize: 1000,
	ttl: CACHE_TTL.PRAYER_TIMES,
});

export const locationCache = new CacheService({
	maxSize: 500,
	ttl: CACHE_TTL.LOCATION,
});
