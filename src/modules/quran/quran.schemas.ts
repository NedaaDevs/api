import { type Static, t } from "elysia";

// A downloadable asset bundle (zip of lines/ + bounds.db + markers/). The app
// downloads `${baseUrl}${path}`, verifies it against `checksum`, and extracts it.
const BundleSchema = t.Object({
	path: t.String(),
	sizeMB: t.Number(),
	checksum: t.String(),
});

// A preview is one fully-rendered (marker-composited) sample page. Display-only,
// so no checksum — unlike bundles, integrity verification doesn't apply.
const PreviewSchema = t.Object({
	page: t.Integer({ minimum: 1 }),
	path: t.String(), // relative to baseUrl → app builds `${baseUrl}${path}`
	width: t.Integer({ minimum: 1 }),
	height: t.Integer({ minimum: 1 }),
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
	baseUrl: t.String(),
	bundle: BundleSchema,
	// Dark-theme bundle, present only on colored mushaf versions (e.g. V4) whose
	// pages can't be tinted client-side. Absence means the version has no dark set.
	darkBundle: t.Optional(BundleSchema),
	totalSizeMB: t.Number(),
	markers: t.Array(t.String()),
	// Light sample pages (every version) — compare styles before download.
	previews: t.Array(PreviewSchema),
	// Dark sample pages, present only on colored mushaf versions (v4), mirroring darkBundle.
	darkPreviews: t.Optional(t.Array(PreviewSchema)),
	// Cache-busting digest over this version's bundle checksum(s) — changes
	// whenever `bundle` (or `darkBundle`, when present) is re-uploaded.
	manifestChecksum: t.String(),
});

export const QuranManifestResponse = t.Object({
	manifestVersion: t.Number(),
	versions: t.Array(QuranVersionSchema),
});

export type QuranManifest = Static<typeof QuranManifestResponse>;
export type QuranVersion = Static<typeof QuranVersionSchema>;
export type QuranBundle = Static<typeof BundleSchema>;
export type QuranPreview = Static<typeof PreviewSchema>;
