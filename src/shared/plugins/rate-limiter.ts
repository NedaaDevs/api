import { rateLimit } from "elysia-rate-limit";

export const globalRateLimit = rateLimit({
	duration: 60 * 1000,
	max: 25,
});

export const locationRateLimit = rateLimit({
	duration: 15 * 60 * 1000, // 15 minutes
	max: 3,
	scoping: "scoped",
});
