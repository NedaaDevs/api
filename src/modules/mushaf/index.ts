import { Elysia } from "elysia";
import { env } from "@/config/env";
import { MushafConfigResponse } from "@/modules/mushaf/mushaf.schemas";

const mushafConfig = {
	version: 1,
	fontsBaseUrl: `${env.CDN_URL}/mushaf/fonts`,
	totalSizeMB: 199,
	totalFonts: 604,
} as const;

export const mushafModule = new Elysia({
	name: "mushafModule",
	prefix: "/mushaf",
	detail: {
		tags: ["Mushaf"],
	},
}).get("/config", () => mushafConfig, {
	response: MushafConfigResponse,
});
