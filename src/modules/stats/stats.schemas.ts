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

// "day" = raw rows (sub-day precision); "week"/"month"/"year" = durable
// daily-bucket sums, immune to the 90-day raw-row sweep; "all" = lifetime,
// served from durable per-id counters. Distinct from StatsPeriodQuery, which
// keeps its own 24h/7d/30d windows for the request-latency summary.
const COUNTER_PERIOD_LITERALS = [
	t.Literal("day"),
	t.Literal("week"),
	t.Literal("month"),
	t.Literal("year"),
	t.Literal("all"),
];

const CounterPeriod = t.Union(COUNTER_PERIOD_LITERALS);

// Default applied by the schema, so handlers never re-state it.
const CounterPeriodQuery = t.Object({
	period: t.Optional(t.Union(COUNTER_PERIOD_LITERALS, { default: "month" })),
});

export const StatsRecitationsQuery = CounterPeriodQuery;

export const StatsRecitationsResponse = t.Object({
	period: CounterPeriod,
	recitations: t.Array(
		t.Object({
			recitationId: t.String(),
			plays: t.Number(),
		}),
	),
});

export const StatsQuranDownloadsQuery = CounterPeriodQuery;

export const StatsQuranDownloadsResponse = t.Object({
	period: CounterPeriod,
	downloads: t.Array(
		t.Object({
			version: t.String(),
			downloads: t.Number(),
		}),
	),
});

export type StatsSummary = Static<typeof StatsSummaryResponse>;
export type StatsRecitations = Static<typeof StatsRecitationsResponse>;
export type StatsQuranDownloads = Static<typeof StatsQuranDownloadsResponse>;
