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
			sizeMB: 93.9,
			checksum:
				"sha256:01a9e41ed6174d2c1d2d44dc54463ffbddac9745d1fd18a7e4e39a836cf643b1",
		},
		totalSizeMB: 272.2,
		markers: MARKERS,
		previews: [
			{ page: 1, path: "/previews/001.webp", width: 1440, height: 3480 },
			{ page: 2, path: "/previews/002.webp", width: 1440, height: 3480 },
			{ page: 302, path: "/previews/302.webp", width: 1440, height: 3480 },
		],
		manifestChecksum:
			"sha256:0d60944ea9cf9f68ff2d3f1fd7a31cac6cc80f1a4876e50bfcf67fd063a536a8",
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
			sizeMB: 106.4,
			checksum:
				"sha256:3fbe40a577323fb2d8f2ef75152d7f9e9f1d4818a1735eb4c251e7700caebd7a",
		},
		totalSizeMB: 298.8,
		markers: MARKERS,
		previews: [
			{ page: 1, path: "/previews/001.webp", width: 1440, height: 3480 },
			{ page: 2, path: "/previews/002.webp", width: 1440, height: 3480 },
			{ page: 302, path: "/previews/302.webp", width: 1440, height: 3480 },
		],
		manifestChecksum:
			"sha256:43e821bb7048834a5d111827e1fd166a4626e6043a54ac2234bc1e8c92839471",
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
			sizeMB: 92,
			checksum:
				"sha256:aacea5cb4c258a8947d287ec3b5274032be4c7bf78ce589f72ef8c2954e91bf2",
		},
		darkBundle: {
			path: "/bundle-dark.zip",
			sizeMB: 92.4,
			checksum:
				"sha256:285cce5428a696eac3d5185d4dc56a094b2116ae870e4868075052e30db9b50c",
		},
		totalSizeMB: 387.6,
		markers: MARKERS,
		previews: [
			{ page: 1, path: "/previews/001.webp", width: 1440, height: 3480 },
			{ page: 2, path: "/previews/002.webp", width: 1440, height: 3480 },
			{ page: 302, path: "/previews/302.png", width: 1440, height: 3480 },
		],
		darkPreviews: [
			{ page: 1, path: "/previews/001-dark.webp", width: 1440, height: 3480 },
			{ page: 2, path: "/previews/002-dark.webp", width: 1440, height: 3480 },
			{ page: 302, path: "/previews/302-dark.png", width: 1440, height: 3480 },
		],
		manifestChecksum:
			"sha256:95e4ac41689080e65a29bbd843b7a4bf543347e99ab3b4ce539b675a8b8e5a81",
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
