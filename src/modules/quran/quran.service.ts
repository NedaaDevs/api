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
				"sha256:39703611bf65d050900725a1b3a421eb22ef7b9004640adf2ff6c0419642748d",
			manifest:
				"sha256:98d7e9df794fbf137a5d3accf819cdd48cc52c1523a5e45da790e4c5a111e1cc",
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
				"sha256:d5125e0f6e92acf845d7ff3f601db852561289600797d8a16d1961e425e2d17b",
			manifest:
				"sha256:0994f9ecab3c3d5726d032b9a6452f465382ce1eab435b34abec3084c37f0796",
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
				"sha256:c580b2caedc2258bd3133d6750174e3b79b6723e9cdfef66bf62eba8fdd742ca",
			manifest:
				"sha256:f68503d9d07d46ebc8bf010cb3477344a64375b601a3e0e3ec6054832183f4d5",
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
