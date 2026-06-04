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
			sizeMB: 97.9,
			checksum:
				"sha256:3bfad5f58669ade66187958d670b645abda9dd3f7d9927a706a569fa0d190ddf",
		},
		totalSizeMB: 110.9,
		markers: MARKERS,
		previews: [
			{ page: 1, path: "/previews/001.webp", width: 1440, height: 3480 },
			{ page: 2, path: "/previews/002.webp", width: 1440, height: 3480 },
			{ page: 302, path: "/previews/302.webp", width: 1440, height: 3480 },
		],
		manifestChecksum:
			"sha256:f23216fe45f49daf06a5942dc6842d707ab72c38627e809c86c505a37885fc02",
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
			sizeMB: 108.9,
			checksum:
				"sha256:2b927ecaae9caad36455fb80925d037ca492032b008e5d0e65a820382c5b5153",
		},
		totalSizeMB: 124.2,
		markers: MARKERS,
		previews: [
			{ page: 1, path: "/previews/001.webp", width: 1440, height: 3480 },
			{ page: 2, path: "/previews/002.webp", width: 1440, height: 3480 },
			{ page: 302, path: "/previews/302.webp", width: 1440, height: 3480 },
		],
		manifestChecksum:
			"sha256:846983ebb6c106e1069a52bd5055d37ed6fde44651c1384e34ba2600e3dd7dfb",
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
			sizeMB: 92.1,
			checksum:
				"sha256:bdf041ad0ec2a4b85d47ad79dc2b770a23005abd017705c5eb4ef0a5948d30f2",
		},
		darkBundle: {
			path: "/bundle-dark.zip",
			sizeMB: 92.5,
			checksum:
				"sha256:de8ff06a7226dd2b68239debb072148a5e560df7217b90a6b49429c54feaff42",
		},
		totalSizeMB: 109.6,
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
			"sha256:addb1c47615154f0be993ce3ecccc46b6e20d1967bcb8bafeab25ae005568bb2",
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
