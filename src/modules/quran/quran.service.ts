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
		totalSizeMB: 96,
		boundsDbSizeMB: 5,
		baseUrl: `${quranBase}/v1`,
		paths: {
			lines: "/lines/{page}/{line}.png",
			boundsDb: "/bounds.db",
			markers: "/markers/{name}.png",
		},
		markers: MARKERS,
		checksums: {
			boundsDb:
				"sha256:58732bcf3d3485df7708908bdabd76ed8c9f0b3e555a7f543936c8a7712a588d",
			manifest:
				"sha256:4966f017f4ead78ce9faadcb4eb30c684f8d510659783155f7ed20dc607d1998",
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
		totalSizeMB: 108,
		boundsDbSizeMB: 5,
		baseUrl: `${quranBase}/v2`,
		paths: {
			lines: "/lines/{page}/{line}.png",
			boundsDb: "/bounds.db",
			markers: "/markers/{name}.png",
		},
		markers: MARKERS,
		checksums: {
			boundsDb:
				"sha256:d3d87b960c51e035a3dc91c0f9ac961567a5dd0197424de5c28ec864091b73be",
			manifest:
				"sha256:98dca13b9532db85564b10c66073fccd9858c1e3ff92000b0bfcbfc9fd164df8",
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
		totalSizeMB: 90,
		boundsDbSizeMB: 5,
		baseUrl: `${quranBase}/v4`,
		paths: {
			lines: "/lines/{page}/{line}.png",
			boundsDb: "/bounds.db",
			markers: "/markers/{name}.png",
		},
		markers: MARKERS,
		checksums: {
			boundsDb:
				"sha256:a277818bd06ed10fe2397c551ca7990a2fabe3203815ab40f448c108c03e86f2",
			manifest:
				"sha256:c679a0887d2558659668f02f8aea49216b7bb62f0c4d8ef79afab913d59bfb9f",
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
