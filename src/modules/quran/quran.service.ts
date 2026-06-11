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
		imageWidth: 2160,
		imageHeight: 348,
		baseUrl: `${quranBase}/v1`,
		bundle: {
			path: "/bundle.zip",
			sizeMB: 153.9,
			checksum:
				"sha256:d3361391e9774f1155ee169673250d0c84a899aeb4960668afeda39de06911f1",
		},
		totalSizeMB: 170.4,
		markers: MARKERS,
		previews: [
			{ page: 1, path: "/previews/001.webp", width: 2160, height: 5220 },
			{ page: 2, path: "/previews/002.webp", width: 2160, height: 5220 },
			{ page: 302, path: "/previews/302.webp", width: 2160, height: 5220 },
		],
		manifestChecksum:
			"sha256:90107179f1ae5c485c91dc6a06a459d8b42b844801886e0f628ad4dc540cc7f9",
		published: true,
	},
	{
		id: "v2",
		name: "Madinah Mushaf V2",
		yearHijri: 1420,
		yearGregorian: 1999,
		totalPages: 604,
		linesPerPage: 15,
		imageWidth: 2160,
		imageHeight: 348,
		baseUrl: `${quranBase}/v2`,
		bundle: {
			path: "/bundle.zip",
			sizeMB: 173.4,
			checksum:
				"sha256:4963219643fd758643868b91ed96ab06803b3b8ad4379f67da159c9e118a139c",
		},
		totalSizeMB: 189.1,
		markers: MARKERS,
		previews: [
			{ page: 1, path: "/previews/001.webp", width: 2160, height: 5220 },
			{ page: 2, path: "/previews/002.webp", width: 2160, height: 5220 },
			{ page: 302, path: "/previews/302.webp", width: 2160, height: 5220 },
		],
		manifestChecksum:
			"sha256:be9f7fc8d3da11a44ea776a5bed4b7374477ba8a79fdd94e7c9959b2438f2b65",
		published: true,
	},
	{
		id: "v4",
		name: "Madinah Mushaf V4",
		yearHijri: 1439,
		yearGregorian: 2017,
		totalPages: 604,
		linesPerPage: 15,
		imageWidth: 2160,
		imageHeight: 348,
		baseUrl: `${quranBase}/v4`,
		bundle: {
			path: "/bundle.zip",
			sizeMB: 144.9,
			checksum:
				"sha256:ff391120364181b5f7e33cd06f6cee461e3e494d07d276c600bb383048c27d37",
		},
		darkBundle: {
			path: "/bundle-dark.zip",
			sizeMB: 146.0,
			checksum:
				"sha256:7e5cfb260e32a503902d97b64e1c3fdc12dae77536be89394c7c9caaf110a88b",
		},
		totalSizeMB: 160.5,
		markers: MARKERS,
		previews: [
			{ page: 1, path: "/previews/001.webp", width: 2160, height: 5220 },
			{ page: 2, path: "/previews/002.webp", width: 2160, height: 5220 },
			{ page: 302, path: "/previews/302.webp", width: 2160, height: 5220 },
		],
		darkPreviews: [
			{ page: 1, path: "/previews/001-dark.webp", width: 2160, height: 5220 },
			{ page: 2, path: "/previews/002-dark.webp", width: 2160, height: 5220 },
			{ page: 302, path: "/previews/302-dark.webp", width: 2160, height: 5220 },
		],
		manifestChecksum:
			"sha256:ce80bc391641ff783bfa20fa174254611c94ba948137576526329e22d30cc6c8",
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
