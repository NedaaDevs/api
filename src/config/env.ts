import { Value } from "@sinclair/typebox/value";
import { type Static, t } from "elysia";

const EnvSchema = t.Object({
	NODE_ENV: t.Union(
		[t.Literal("development"), t.Literal("production"), t.Literal("test")],
		{ default: "development" },
	),
	PORT: t.Integer({
		default: 3004,
		description: "Port number",
	}),
	ALADHAN_API_KEY: t.Optional(
		t.String({
			description: "Aladhan API key",
		}),
	),
	BIGDATACLOUD_API_KEY: t.Optional(
		t.String({
			description: "BigDataCloud API key",
		}),
	),
});

export type Env = Static<typeof EnvSchema>;

const loadEnv = () => {
	const withDefaults = Value.Default(EnvSchema, process.env);
	try {
		return Value.Decode(EnvSchema, withDefaults);
	} catch {
		const errors = [...Value.Errors(EnvSchema, withDefaults)];
		const seen = new Set<string>();
		console.error("Invalid environment variables:\n");
		for (const error of errors) {
			const key = error.path.replace("/", "");
			if (seen.has(key)) continue;
			seen.add(key);
			console.error(`- ${key}: ${error.message}`);
		}
		console.error("\n");
		process.exit(1);
	}
};

export const env = loadEnv();
