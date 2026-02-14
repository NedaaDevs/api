import { t } from "elysia";

// Audio file entry in manifest
const AudioFileEntrySchema = t.Object({
	url: t.String(),
	duration: t.Number(),
	size: t.Number(),
});

// Session marker for full recordings
const SessionMarkerSchema = t.Object({
	thikrId: t.String(),
	start: t.Number(),
	end: t.Number(),
	totalCount: t.Number(),
});

// Session file entry
const SessionFileEntrySchema = t.Object({
	url: t.String(),
	duration: t.Number(),
	size: t.Number(),
	markers: t.Array(SessionMarkerSchema),
});

// Reciter catalog entry
const ReciterCatalogEntrySchema = t.Object({
	id: t.String(),
	name: t.Record(t.String(), t.String()),
	avatar: t.String(),
	type: t.Union([
		t.Literal("clips"),
		t.Literal("session"),
		t.Literal("hybrid"),
	]),
	totalSize: t.Number(),
	thikrCount: t.Number(),
	sampleUrl: t.String(),
	manifestUrl: t.String(),
	isDefault: t.Boolean(),
});

// GET /athkar/reciters response
export const ReciterCatalogResponse = t.Object({
	version: t.Number(),
	reciters: t.Array(ReciterCatalogEntrySchema),
});

// GET /athkar/reciters/:id/manifest response
export const ReciterManifestResponse = t.Object({
	id: t.String(),
	version: t.Number(),
	type: t.Union([
		t.Literal("clips"),
		t.Literal("session"),
		t.Literal("hybrid"),
	]),
	files: t.Record(t.String(), AudioFileEntrySchema),
	sessions: t.Optional(t.Record(t.String(), SessionFileEntrySchema)),
});

// Route params
export const ReciterIdParam = t.Object({
	id: t.String(),
});
