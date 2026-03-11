import { type Static, t } from "elysia";

const EndpointStatSchema = t.Object({
	endpoint: t.String(),
	count: t.Number(),
	avgMs: t.Number(),
	errorRate: t.Number(),
});

export const StatsSummaryResponse = t.Object({
	period: t.String(),
	totalRequests: t.Number(),
	errorRate: t.Number(),
	avgResponseTimeMs: t.Number(),
	endpoints: t.Array(EndpointStatSchema),
	statusCodes: t.Record(t.String(), t.Number()),
});

export const StatsPeriodQuery = t.Object({
	period: t.Optional(
		t.Union([t.Literal("24h"), t.Literal("7d"), t.Literal("30d")]),
	),
});

export type StatsSummary = Static<typeof StatsSummaryResponse>;
