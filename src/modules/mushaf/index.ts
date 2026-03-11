import { Elysia } from "elysia";
import { env } from "@/config/env";
import { MushafConfigResponse } from "@/modules/mushaf/mushaf.schemas";

const mushafConfig = {
	version: 1,
	baseUrl: `${env.CDN_URL}/mushaf`,
	manifestUrl: `${env.CDN_URL}/mushaf/manifest.json`,
	pagesBaseUrl: `${env.CDN_URL}/mushaf/pages`,
	imageWidth: 2048,
	imageHeight: 3313,
	totalPages: 604,
	totalSizeMB: 110,
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
