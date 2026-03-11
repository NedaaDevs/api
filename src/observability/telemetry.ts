import { opentelemetry } from "@elysiajs/opentelemetry";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-node";
import { env } from "@/config/env";

// Only export to Jaeger if OTEL endpoint is configured
const spanProcessors = env.OTEL_EXPORTER_OTLP_ENDPOINT
	? [
			new BatchSpanProcessor(
				new OTLPTraceExporter({
					url: `${env.OTEL_EXPORTER_OTLP_ENDPOINT}/v1/traces`,
				}),
			),
		]
	: [];

export const telemetry = opentelemetry({
	serviceName: "nedaa-api",
	spanProcessors,
});
