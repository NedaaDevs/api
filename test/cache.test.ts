import { beforeEach, describe, expect, test } from "bun:test";

import {
	bucketCoordinates,
	CacheService,
	createCacheKey,
} from "@/shared/services/cache";

describe("bucketCoordinates", () => {
	test("rounds to 2 decimal places", () => {
		expect(bucketCoordinates(24.7136, 46.6753)).toEqual([24.71, 46.68]);
		expect(bucketCoordinates(24.714, 46.674)).toEqual([24.71, 46.67]);
	});

	test("nearby coordinates produce same bucket", () => {
		const bucket1 = bucketCoordinates(24.7136, 46.6753);
		const bucket2 = bucketCoordinates(24.7137, 46.6754);
		const bucket3 = bucketCoordinates(24.7138, 46.6755);

		expect(bucket1).toEqual(bucket2);
		expect(bucket2).toEqual(bucket3);
	});

	test("handles negative coordinates", () => {
		expect(bucketCoordinates(-33.8688, 151.2093)).toEqual([-33.87, 151.21]);
	});
});

describe("createCacheKey", () => {
	const cache = new CacheService<string>({ maxSize: 10, ttl: 1000 });

	// Create
	test("creates key without params", () => {
		const key = createCacheKey("prayers", 24.7136, 46.6753);
		expect(key).toBe("prayers:24.71:46.68");
	});

	test("creates key with params", () => {
		const key = createCacheKey("prayers", 24.71, 46.68, {
			provider: "aladhan",
			method: "2",
		});
		expect(key).toBe("prayers:24.71:46.68:method=2&provider=aladhan");
	});

	test("sorts params for consistent keys", () => {
		const key1 = createCacheKey("prayers", 24.71, 46.68, { b: "2", a: "1" });
		const key2 = createCacheKey("prayers", 24.71, 46.68, { a: "1", b: "2" });
		expect(key1).toBe(key2);
	});

	test("has returns true for existing key", () => {
		cache.set("key1", "value1");
		expect(cache.has("key1")).toBe(true);
	});

	test("has returns false for missing key", () => {
		expect(cache.has("missing")).toBe(false);
	});

	test("has returns false for expired key", async () => {
		const shortCache = new CacheService<string>({ maxSize: 10, ttl: 50 });
		shortCache.set("key1", "value1");
		await new Promise((r) => setTimeout(r, 60));
		expect(shortCache.has("key1")).toBe(false);
	});

	// Delete
	test("delete removes existing key", () => {
		cache.set("key1", "value1");
		expect(cache.delete("key1")).toBe(true);
		expect(cache.get("key1")).toBeUndefined();
	});

	test("delete returns false for missing key", () => {
		expect(cache.delete("missing")).toBe(false);
	});

	// Clear
	test("clear removes all entries and resets stats", () => {
		cache.set("key1", "value1");
		cache.set("key2", "value2");
		cache.get("key1"); // hit

		cache.clear();

		expect(cache.get("key1")).toBeUndefined();
		expect(cache.getStats()).toEqual({
			size: 0,
			hits: 0,
			misses: 1,
			hitRate: 0,
		});
	});

	//   prune
	test("prune removes only expired entries", async () => {
		const shortCache = new CacheService<string>({ maxSize: 10, ttl: 50 });
		shortCache.set("expire1", "value1");
		shortCache.set("expire2", "value2");

		await new Promise((r) => setTimeout(r, 60));

		shortCache.set("fresh", "value3"); // added after delay, not expired

		const pruned = shortCache.prune();

		expect(pruned).toBe(2);
		expect(shortCache.has("fresh")).toBe(true);
	});
});

describe("CacheService", () => {
	let cache: CacheService<string>;

	beforeEach(() => {
		cache = new CacheService({ maxSize: 3, ttl: 1000 });
	});

	test("get/set basic operations", () => {
		cache.set("key1", "value1");
		expect(cache.get("key1")).toBe("value1");
	});

	test("returns undefined for missing key", () => {
		expect(cache.get("missing")).toBeUndefined();
	});

	test("tracks hits and misses", () => {
		cache.set("key1", "value1");
		cache.get("key1"); // hit
		cache.get("key1"); // hit
		cache.get("missing"); // miss

		const stats = cache.getStats();
		expect(stats.hits).toBe(2);
		expect(stats.misses).toBe(1);
		expect(stats.hitRate).toBeCloseTo(0.67, 1);
	});

	test("LRU eviction when at capacity", () => {
		cache.set("key1", "value1");
		cache.set("key2", "value2");
		cache.set("key3", "value3");
		cache.set("key4", "value4"); // should evict key1

		expect(cache.get("key1")).toBeUndefined();
		expect(cache.get("key4")).toBe("value4");
	});

	test("expires entries after TTL", async () => {
		const shortCache = new CacheService<string>({ maxSize: 20, ttl: 50 });
		shortCache.set("key1", "value1");

		expect(shortCache.get("key1")).toBe("value1");

		await new Promise((r) => setTimeout(r, 60));

		expect(shortCache.get("key1")).toBeUndefined();
	});
});
