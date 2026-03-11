import { type Static, t } from "elysia";

export const MushafConfigResponse = t.Object({
	version: t.Number(),
	baseUrl: t.String(),
	manifestUrl: t.String(),
	pagesBaseUrl: t.String(),
	imageWidth: t.Number(),
	imageHeight: t.Number(),
	totalPages: t.Number(),
	totalSizeMB: t.Number(),
});

export type MushafConfig = Static<typeof MushafConfigResponse>;
