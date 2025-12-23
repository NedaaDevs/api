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
	const [bucketLat, bucketLng] = bucketCoordinates(lat, lng);
	const base = `${prefix}:${bucketLat}:${bucketLng}`;

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

	get(key: string): T | undefined {
		const entry = this.cache.get(key);

		if (!entry) {
			this.stats.misses++;
			return undefined;
		}

		// Check expiration
		if (Date.now() > entry.expiresAt) {
			this.cache.delete(key);
			this.stats.misses++;
			return undefined;
		}

		this.stats.hits++;
		return entry.value;
	}

	set(key: string, value: T, ttl?: number): void {
		// FIFO eviction
		if (this.cache.size >= this.maxSize) {
			const firstKey = this.cache.keys().next().value;
			if (firstKey) this.cache.delete(firstKey);
		}

		this.cache.set(key, {
			value,
			expiresAt: Date.now() + (ttl ?? this.defaultTTL),
		});
	}

	has(key: string): boolean {
		const entry = this.cache.get(key);
		if (!entry) return false;
		if (Date.now() > entry.expiresAt) {
			this.cache.delete(key);
			return false;
		}
		return true;
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
