import { type Static, t } from "elysia";

export const MushafConfigResponse = t.Object({
	version: t.Number(),
	fontsBaseUrl: t.String(),
	totalSizeMB: t.Number(),
	totalFonts: t.Number(),
});

export type MushafConfig = Static<typeof MushafConfigResponse>;
