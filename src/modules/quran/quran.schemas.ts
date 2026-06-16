import { type Static, t } from "elysia";

// A downloadable artifact. The app fetches `${manifest.baseUrl}/${url}`, verifies
// it against `sha256` (which doubles as change-detection), and extracts it.
const ArtifactSchema = t.Object({
	url: t.String(), // path relative to manifest.baseUrl
	bytes: t.Integer({ minimum: 0 }),
	sha256: t.String(),
});

// Image layer — page/line PNGs, per theme. Big, stable; bumps only when pixels
// change. `version` is an ISO-8601 date publish tag; bounds are shared across
// themes so the version is theme-independent.
const ImagesSchema = t.Object({
	version: t.String(),
	pages: t.Integer({ minimum: 1 }),
	light: ArtifactSchema,
	// Dark-theme images, present only on colored mushaf editions (v4) whose pages
	// can't be tinted client-side. Absence means the edition has no dark set.
	dark: t.Optional(ArtifactSchema),
});

// Meta layer — bounds.db (theme-shared). Small, volatile; bumps on
// bounds/marker/frame/tajweed changes.
const MetaSchema = t.Object({
	version: t.String(), // ISO-8601 date publish tag
	// == bounds.db PRAGMA user_version (0 = unstamped/pre-v2 bounds, e.g. v1/v2).
	schema: t.Integer({ minimum: 0 }),
	// Compatibility floor: the app refuses this meta if `requiresImages` exceeds
	// the installed images.version (string compare, valid for ISO-8601 dates).
	requiresImages: t.String(),
	url: t.String(),
	bytes: t.Integer({ minimum: 0 }),
	sha256: t.String(),
});

// One fully-rendered sample page. Display-only, so no sha256 — integrity
// verification doesn't apply.
const PreviewSchema = t.Object({
	page: t.Integer({ minimum: 1 }),
	url: t.String(), // relative to manifest.baseUrl
	width: t.Integer({ minimum: 1 }),
	height: t.Integer({ minimum: 1 }),
});

const EditionSchema = t.Object({
	id: t.String(),
	name: t.String(),
	imageType: t.Union([t.Literal("line"), t.Literal("page")]),
	resolution: t.Integer({ minimum: 1 }), // production res the bundle ships at
	// Resolution-independent edition identity (version picker display).
	yearHijri: t.Number(),
	yearGregorian: t.Number(),
	linesPerPage: t.Number(),
	images: ImagesSchema,
	meta: MetaSchema,
	// Light sample pages (every edition) — compare styles before download.
	previews: t.Array(PreviewSchema),
	// Dark sample pages, present only on colored mushaf editions (v4).
	darkPreviews: t.Optional(t.Array(PreviewSchema)),
	// False = unreleased; app hides this edition in production builds, dev only.
	published: t.Boolean(),
});

// A selectable ornament style pack, positioned at runtime from bounds.db.
const OrnamentOptionSchema = t.Object({
	id: t.String(),
	version: t.String(), // ISO-8601 publish tag — bumps only when THIS option changes
	resolution: t.Integer({ minimum: 1 }), // image-space the assets are authored in
	// Compatible editions; omit = offered for all. The app hides options whose
	// `editions` exclude the selected edition.
	editions: t.Optional(t.Array(t.String())),
	url: t.String(),
	bytes: t.Integer({ minimum: 0 }),
	sha256: t.String(),
	preview: t.String(), // version-stamped path, lazy-fetched on selection
});

const OrnamentCategorySchema = t.Object({
	// App-bundled offline baseline id — NOT listed in `options`.
	default: t.String(),
	// Optional per-edition best pick that overrides `default`.
	defaultByEdition: t.Optional(t.Record(t.String(), t.String())),
	// Downloadable packs only; the bundled `default` is omitted.
	options: t.Array(OrnamentOptionSchema),
});

const OrnamentsSchema = t.Object({
	ayahMarker: OrnamentCategorySchema,
	surahFrame: OrnamentCategorySchema,
	pageHolder: OrnamentCategorySchema,
});

// Content layer — quran.db (ayah text + FTS5 search, surah/division metadata,
// mushaf layout/words, mutashabihat). Shared across ALL editions (unlike
// bounds.db, which is per-edition), so it lives at the manifest top level.
const ContentSchema = t.Object({
	version: t.String(), // ISO-8601 date publish tag
	// == quran.db db_meta.schema_version (key/value table, not PRAGMA).
	schema: t.Integer({ minimum: 0 }),
	url: t.String(), // path relative to manifest.baseUrl
	bytes: t.Integer({ minimum: 0 }),
	sha256: t.String(),
});

export const QuranManifestResponse = t.Object({
	manifestSchema: t.Number(), // manifest format version (distinct from edition.meta.schema)
	baseUrl: t.String(), // artifact urls are resolved against this
	editions: t.Array(EditionSchema), // ordered — display order is listing order
	ornaments: OrnamentsSchema,
	// Shared Quran content DB; absent until the content layer has been uploaded.
	content: t.Optional(ContentSchema),
});

export type QuranManifest = Static<typeof QuranManifestResponse>;
export type QuranEdition = Static<typeof EditionSchema>;
export type QuranImages = Static<typeof ImagesSchema>;
export type QuranMeta = Static<typeof MetaSchema>;
export type QuranArtifact = Static<typeof ArtifactSchema>;
export type QuranPreview = Static<typeof PreviewSchema>;
export type QuranOrnaments = Static<typeof OrnamentsSchema>;
export type QuranOrnamentOption = Static<typeof OrnamentOptionSchema>;
export type QuranContent = Static<typeof ContentSchema>;
