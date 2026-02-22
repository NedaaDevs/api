import { describe, expect, test } from "bun:test";

import { bucketCoordinates, createCacheKey } from "@/shared/services/cache";

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
	test("creates key without params (no bucketing)", () => {
		const key = createCacheKey("prayers", 24.7136, 46.6753);
		expect(key).toBe("prayers:24.7136:46.6753");
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
});

// TODO: CacheService tests skipped — caching is disabled for debugging
