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
	ALADHAN_API_URL: t.String({
		default: "https://api.aladhan.com",
		description: "Aladhan API URL",
	}),

	BDC_API_URL: t.String({
		default: "https://api-bdc.net",
		description: "BigDataCloud API base URL",
	}),
	BDC_API_KEY: t.String({
		description: "BigDataCloud API key",
	}),
	CDN_URL: t.String({
		default: "https://cdn.nedaa.dev",
		description: "CDN base URL for static assets",
	}),
	ADMIN_API_KEY: t.String({
		description: "Secret key for admin endpoints (cache clear, etc.)",
	}),
	OTEL_EXPORTER_OTLP_ENDPOINT: t.Optional(
		t.String({
			description: "OpenTelemetry OTLP exporter endpoint",
		}),
	),
	// Feedback s3
	FEEDBACK_S3_ENDPOINT: t.Optional(t.String({ description: "S3" })),
	FEEDBACK_S3_ACCESS_KEY_ID: t.Optional(t.String({ description: "S3" })),
	FEEDBACK_S3_SECRET_ACCESS_KEY: t.Optional(t.String({ description: "S3" })),
	FEEDBACK_S3_BUCKET_NAME: t.Optional(t.String({ description: "S3" })),
	// Feedback - queue
	FEEDBACK_REDIS_URL: t.Optional(
		t.String({ description: "Valkey URL fro BullMQ" }),
	),
	// Feedback Notification - Telegram
	FEEDBACK_NOTIFICATION_BOT_TOKEN: t.Optional(t.String({ description: "" })),
	TELEGRAM_CHAT_ID: t.Optional(t.String()),
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
