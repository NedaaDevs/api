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

export const feedbackRateLimit = rateLimit({
	duration: 60 * 1000, // 1 minute
	max: 10,
	scoping: "scoped",
});
