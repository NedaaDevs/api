import { type Static, t } from "elysia";

const ChecksumsSchema = t.Object({
	bundle: t.String(),
	manifest: t.String(),
});

const PathsSchema = t.Object({
	bundle: t.String(),
});

const QuranVersionSchema = t.Object({
	id: t.String(),
	name: t.String(),
	yearHijri: t.Number(),
	yearGregorian: t.Number(),
	totalPages: t.Number(),
	linesPerPage: t.Number(),
	imageWidth: t.Number(),
	imageHeight: t.Number(),
	bundleSizeMB: t.Number(),
	totalSizeMB: t.Number(),
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
