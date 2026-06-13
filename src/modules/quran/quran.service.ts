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
		baseUrl: `${quranBase}/v1`,
		bundle: {
			path: "/bundle.zip",
			sizeMB: 97.7,
			checksum:
				"sha256:e7709f68b2911c1a37273da663beffb96c65948373b6415a963294c6e9b2163b",
		},
		totalSizeMB: 110.9,
		markers: MARKERS,
		previews: [
			{ page: 1, path: "/previews/001.webp", width: 1440, height: 3480 },
			{ page: 2, path: "/previews/002.webp", width: 1440, height: 3480 },
			{ page: 302, path: "/previews/302.webp", width: 1440, height: 3480 },
		],
		manifestChecksum:
			"sha256:ab1fdd4be842537d3706d37d29858de7dfe0533e3f1300c736203e2c96c6d9c1",
		published: true,
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
		baseUrl: `${quranBase}/v2`,
		bundle: {
			path: "/bundle.zip",
			sizeMB: 108.8,
			checksum:
				"sha256:716ccac0b4fe1c417eab2983ceabec3003c8c39e85fd8f6b6dcf77284d71f26b",
		},
		totalSizeMB: 124.1,
		markers: MARKERS,
		previews: [
			{ page: 1, path: "/previews/001.webp", width: 1440, height: 3480 },
			{ page: 2, path: "/previews/002.webp", width: 1440, height: 3480 },
			{ page: 302, path: "/previews/302.webp", width: 1440, height: 3480 },
		],
		manifestChecksum:
			"sha256:535f66c17444fdceaf5a70f485b6a98ba016fe0dd8e1e2654a165103a28f2945",
		published: true,
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
		baseUrl: `${quranBase}/v4`,
		bundle: {
			path: "/bundle.zip",
			sizeMB: 93.4,
			checksum:
				"sha256:66d96688d8489098ca05698537406a8626ddaf87f468acc41fe3237e45f3651c",
		},
		darkBundle: {
			path: "/bundle-dark.zip",
			sizeMB: 97.5,
			checksum:
				"sha256:a60920f166bdbe009ff5430dea74b516f0f77ba22695238989083e4dbe7e8efa",
		},
		totalSizeMB: 109.8,
		markers: MARKERS,
		previews: [
			{ page: 1, path: "/previews/001.webp", width: 1440, height: 3480 },
			{ page: 2, path: "/previews/002.png", width: 1440, height: 3480 },
			{ page: 302, path: "/previews/302.png", width: 1440, height: 3480 },
		],
		darkPreviews: [
			{ page: 1, path: "/previews/001-dark.webp", width: 1440, height: 3480 },
			{ page: 2, path: "/previews/002-dark.webp", width: 1440, height: 3480 },
			{ page: 302, path: "/previews/302-dark.png", width: 1440, height: 3480 },
		],
		manifestChecksum:
			"sha256:ed341088959309deed1e0fd9fbe2e1a40cd2ab7acb8f3cfc0ff1ab38ae12aee7",
		published: true,
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
