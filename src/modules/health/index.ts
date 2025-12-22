import { Elysia, t } from "elysia";

const getHealth = () => ({
	status: "ok",
	timestamp: new Date().toISOString(),
});

const healthSchema = t.Object({
	status: t.String(),
	timestamp: t.String(),
});

export const healthModule = new Elysia({
	name: "health",
	prefix: "/health",
	detail: {
		tags: ["Health"],
	},
}).get("/", getHealth, {
	response: healthSchema,
});
