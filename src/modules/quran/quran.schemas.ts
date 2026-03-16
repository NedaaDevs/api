import { type Static, t } from "elysia";

const ChecksumsSchema = t.Object({
	boundsDb: t.String(),
	manifest: t.String(),
});

const PathsSchema = t.Object({
	lines: t.Optional(t.String()),
	pages: t.Optional(t.String()),
	boundsDb: t.String(),
	markers: t.String(),
});

const QuranVersionSchema = t.Object({
	id: t.String(),
	name: t.String(),
	type: t.Union([t.Literal("line"), t.Literal("page")]),
	yearHijri: t.Number(),
	yearGregorian: t.Number(),
	totalPages: t.Number(),
	linesPerPage: t.Number(),
	imageWidth: t.Number(),
	imageHeight: t.Number(),
	totalSizeMB: t.Number(),
	boundsDbSizeMB: t.Number(),
	baseUrl: t.String(),
	paths: PathsSchema,
	markers: t.Array(t.String()),
	checksums: ChecksumsSchema,
});

export const QuranManifestResponse = t.Object({
	manifestVersion: t.Number(),
	versions: t.Array(QuranVersionSchema),
});

export type QuranManifest = Static<typeof QuranManifestResponse>;
export type QuranVersion = Static<typeof QuranVersionSchema>;
