import { env } from "@/config/env";
import type { QuranManifest, QuranVersion } from "./quran.schemas";

const quranBase = `${env.CDN_URL}/quran`;

const MARKERS = ["marker-light", "marker-dark", "marker-sepia", "surah-frame"];

const VERSIONS: QuranVersion[] = [
	{
		id: "v1",
		name: "Madinah Mushaf V1",
		type: "page",
		yearHijri: 1405,
		yearGregorian: 1984,
		totalPages: 604,
		linesPerPage: 15,
		imageWidth: 1440,
		imageHeight: 232,
		totalSizeMB: 94.2,
		boundsDbSizeMB: 5,
		baseUrl: `${quranBase}/v1`,
		paths: {
			pages: "/pages/{page}.png",
			boundsDb: "/bounds.db",
			markers: "/markers/{name}.png",
		},
		markers: MARKERS,
		checksums: {
			boundsDb:
				"sha256:254d0fb59ed3b1329c4d426d6441b48f8a27eca60aeeabdbeb1b03787dd993ad",
			manifest:
				"sha256:113b2c3544e110eee0dbbe3ffe1dfb05e383b04d54b27b9ae3fbc8b2eaa8d0d0",
		},
	},
	{
		id: "v2",
		name: "Madinah Mushaf V2",
		type: "page",
		yearHijri: 1420,
		yearGregorian: 1999,
		totalPages: 604,
		linesPerPage: 15,
		imageWidth: 1440,
		imageHeight: 232,
		totalSizeMB: 105.2,
		boundsDbSizeMB: 5,
		baseUrl: `${quranBase}/v2`,
		paths: {
			pages: "/pages/{page}.png",
			boundsDb: "/bounds.db",
			markers: "/markers/{name}.png",
		},
		markers: MARKERS,
		checksums: {
			boundsDb:
				"sha256:9aef9efc84797b35b557901cbd7f09a87fc38e8a9745649b7f55d680a86a372f",
			manifest:
				"sha256:3d6fc87bdb61cd546c790fa8939ae397f10f07697ea4983bf668eac170710883",
		},
	},
	{
		id: "v4",
		name: "Madinah Mushaf V4",
		type: "page",
		yearHijri: 1439,
		yearGregorian: 2017,
		totalPages: 604,
		linesPerPage: 15,
		imageWidth: 1440,
		imageHeight: 232,
		totalSizeMB: 100.2,
		boundsDbSizeMB: 5,
		baseUrl: `${quranBase}/v4`,
		paths: {
			pages: "/pages/{page}.png",
			boundsDb: "/bounds.db",
			markers: "/markers/{name}.png",
		},
		markers: MARKERS,
		checksums: {
			boundsDb:
				"sha256:8d93a499b567f05cd5bad72ba19fca96754d8e98afa6b8733f75da31f3c21ddc",
			manifest:
				"sha256:e768549744c40f2fe421a1edcd077cc3399405e61459d987614f22c2c217b8d7",
		},
	},
];

const MANIFEST: QuranManifest = {
	manifestVersion: 1,
	versions: VERSIONS,
};

// biome-ignore lint/complexity/noStaticOnlyClass: follows existing service pattern
export abstract class QuranService {
	static getManifest(): QuranManifest {
		return MANIFEST;
	}
}
