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

// One image-resolution variant of a version. The app picks an entry by device
// screen size (smaller screens → 1440, tablets/foldables → 2160). Each entry is
// self-contained: its own bundles, previews, and cache-busting digest.
const QuranResolutionSchema = t.Object({
	// Page image width in px (1440 | 2160). imageHeight scales with it (232 | 348).
	width: t.Number(),
	imageHeight: t.Number(),
	// `${CDN}/quran/<id>/<width>` — bundle/preview paths are relative to this.
	baseUrl: t.String(),
	bundle: BundleSchema,
	// Dark-theme bundle, present only on colored mushaf versions (e.g. V4) whose
	// pages can't be tinted client-side. Absence means this version has no dark set.
	darkBundle: t.Optional(BundleSchema),
	totalSizeMB: t.Number(),
	// Light sample pages — compare styles before download.
	previews: t.Array(PreviewSchema),
	// Dark sample pages, present only on colored mushaf versions (v4), mirroring darkBundle.
	darkPreviews: t.Optional(t.Array(PreviewSchema)),
	// Cache-busting digest over this resolution's bundle checksum(s) — changes
	// whenever `bundle` (or `darkBundle`, when present) is re-uploaded.
	manifestChecksum: t.String(),
});

const QuranVersionSchema = t.Object({
	id: t.String(),
	name: t.String(),
	yearHijri: t.Number(),
	yearGregorian: t.Number(),
	totalPages: t.Number(),
	linesPerPage: t.Number(),
	// Resolution-independent marker templates (runtime overlay via bounds.db).
	markers: t.Array(t.String()),
	// Downloadable variants by image resolution; the app selects one per device.
	resolutions: t.Array(QuranResolutionSchema),
	// False = unreleased; app hides this version in production builds, shows it in dev only.
	published: t.Boolean(),
});

export const QuranManifestResponse = t.Object({
	manifestVersion: t.Number(),
	versions: t.Array(QuranVersionSchema),
});

export type QuranManifest = Static<typeof QuranManifestResponse>;
export type QuranVersion = Static<typeof QuranVersionSchema>;
export type QuranResolution = Static<typeof QuranResolutionSchema>;
export type QuranBundle = Static<typeof BundleSchema>;
export type QuranPreview = Static<typeof PreviewSchema>;
