import { type Static, t } from "elysia";

// Shared
export const AttachmentKind = t.Union([
	t.Literal("logs"),
	t.Literal("image"),
	t.Literal("video"),
]);

export const AppMeta = t.Object({
	version: t.String({ maxLength: 32 }),
	build: t.String({ maxLength: 32 }),
	platform: t.Union([t.Literal("ios"), t.Literal("android")]),
	osVersion: t.String({ maxLength: 32 }),
	device: t.Optional(t.String({ maxLength: 64 })),
	source: t.String({ maxLength: 32, default: "unknown" }),
	locale: t.Optional(t.String({ maxLength: 16 })),
});

export const AttachmentInput = t.Object({
	kind: AttachmentKind,
	mime: t.String({ maxLength: 128 }),
	bytes: t.Integer({ minimum: 1, maximum: 100 * 1024 * 1024 }),
});

// POST /feedback-reports
export const CreateReportBody = t.Object({
	type: t.Union([
		t.Literal("crash"),
		t.Literal("bug"),
		t.Literal("feature"),
		t.Literal("other"),
	]),
	message: t.Optional(t.String({ maxLength: 4000 })),
	area: t.Optional(t.String({ maxLength: 64 })),
	contact: t.Optional(t.Object({ value: t.String({ maxLength: 256 }) })),
	app: AppMeta,
	attachments: t.Optional(t.Array(AttachmentInput, { maxItems: 3 })),
	clientKey: t.String({ format: "uuid" }),
});

export const CreateReportResponse = t.Object({
	id: t.String(),
	submitToken: t.String(),
	tier: t.Union([t.Literal("basic"), t.Literal("attested")]),
	uploads: t.Array(
		t.Object({
			attachmentId: t.String(),
			url: t.String({ format: "uri" }),
			headers: t.Optional(t.Record(t.String(), t.String())),
		}),
	),
});

// PATCH /feedback-reports/:id
export const SubmitBody = t.Object({ submitToken: t.String() });
export const SubmitResponse = t.Object({ status: t.Literal("SUBMITTED") });

export type CreateReport = Static<typeof CreateReportBody>;
export type AppMetaT = Static<typeof AppMeta>;
