import { env } from "@/config/env";
import type { QuranManifest, QuranVersion } from "./quran.schemas";

const quranBase = `${env.CDN_URL}/quran`;

const MARKERS = ["marker-light", "marker-dark", "marker-sepia", "surah-frame"];

const VERSIONS: QuranVersion[] = [
	{
		id: "v1",
		name: "Madinah Mushaf V1",
		yearHijri: 1405,
		yearGregorian: 1984,
		totalPages: 604,
		linesPerPage: 15,
		imageWidth: 1440,
		imageHeight: 232,
		bundleSizeMB: 97.7,
		totalSizeMB: 111.3,
		baseUrl: `${quranBase}/v1`,
		paths: {
			bundle: "/bundle.zip",
		},
		markers: MARKERS,
		checksums: {
			bundle:
				"sha256:811f8ac4820c7fa09d80de6ee254ca361de3df84b959b93a4e2fe3a84b3a2dec",
			manifest:
				"sha256:c769320ede78bb96b92818bcb3cc0be7bb69d6c1d51475c992c58d2792179751",
		},
	},
	{
		id: "v2",
		name: "Madinah Mushaf V2",
		yearHijri: 1420,
		yearGregorian: 1999,
		totalPages: 604,
		linesPerPage: 15,
		imageWidth: 1440,
		imageHeight: 232,
		bundleSizeMB: 108.7,
		totalSizeMB: 124.5,
		baseUrl: `${quranBase}/v2`,
		paths: {
			bundle: "/bundle.zip",
		},
		markers: MARKERS,
		checksums: {
			bundle:
				"sha256:84f87c01423153d9d977f305e83327d7611c7fa985c576e0435c9c044dc9f4cc",
			manifest:
				"sha256:dcfe0919cdab0f53e34c7c6b3a9abf3c00b63ee451c84fd15f6c6e3a9ba639d2",
		},
	},
	{
		id: "v4",
		name: "Madinah Mushaf V4",
		yearHijri: 1439,
		yearGregorian: 2017,
		totalPages: 604,
		linesPerPage: 15,
		imageWidth: 1440,
		imageHeight: 232,
		bundleSizeMB: 92.0,
		totalSizeMB: 109.9,
		baseUrl: `${quranBase}/v4`,
		paths: {
			bundle: "/bundle.zip",
		},
		markers: MARKERS,
		checksums: {
			bundle:
				"sha256:0ce0df07dafbca0d787ca865ee90ef1387256c57940080c6cc2136a35d635c37",
			manifest:
				"sha256:63d2b736afaa3a6c6e5006a6cb5dc4c99305a0fb1be224cebc978f655ddb59b1",
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
