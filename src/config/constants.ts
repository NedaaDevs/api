export const RATE_LIMIT = {
	GLOBAL: {
		limit: 25,
		duration: 60 * 1000, // 1 minute
	},
	REVERSE_GEOCODING: {
		limit: 3,
		duration: 60 * 1000 * 15, // 15 minutes
	},
} as const;

export const CACHE_TTL = {
	PRAYER_TIMES: 24 * 60 * 60 * 1000, // 24 hours,
	LOCATION: 7 * 24 * 60 * 60 * 1000, // 7 days
	ATHKAR_MANIFEST: 24 * 60 * 60 * 1000, // 24 hours
} as const;
