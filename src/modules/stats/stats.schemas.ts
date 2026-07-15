import { type Static, t } from "elysia";

const EndpointStatSchema = t.Object({
	endpoint: t.String(),
	count: t.Number(),
	avgMs: t.Number(),
	errorRate: t.Number(),
	p95Ms: t.Number(),
	p99Ms: t.Number(),
});

const ModuleStatSchema = t.Object({
	module: t.String(),
	count: t.Number(),
	avgMs: t.Number(),
	errorRate: t.Number(),
});

export const StatsSummaryResponse = t.Object({
	period: t.String(),
	totalRequests: t.Number(),
	errorRate: t.Number(),
	serverErrorRate: t.Number(),
	avgResponseTimeMs: t.Number(),
	p50Ms: t.Number(),
	p95Ms: t.Number(),
	p99Ms: t.Number(),
	endpoints: t.Array(EndpointStatSchema),
	statusCodes: t.Record(t.String(), t.Number()),
	modules: t.Array(ModuleStatSchema),
	intrusionAttempts: t.Number(),
});

export const StatsPeriodQuery = t.Object({
	period: t.Optional(
		t.Union([t.Literal("24h"), t.Literal("7d"), t.Literal("30d")]),
	),
});

export const StatsRecitationsQuery = t.Object({
	period: t.Optional(
		t.Union([
			t.Literal("24h"),
			t.Literal("7d"),
			t.Literal("30d"),
			t.Literal("all"),
		]),
	),
});

export const StatsRecitationsResponse = t.Object({
	period: t.String(),
	recitations: t.Array(
		t.Object({
			recitationId: t.String(),
			plays: t.Number(),
		}),
	),
});

export type StatsSummary = Static<typeof StatsSummaryResponse>;
export type StatsRecitations = Static<typeof StatsRecitationsResponse>;
