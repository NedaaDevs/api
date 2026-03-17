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
				"sha256:2a3cafac2123ae79fbe6e7a1ca82dbd99f0aa5fd77d811cbd6e54b0b691e577a",
			manifest:
				"sha256:d18f1dce46e6328990c78166c66cfd0a7ebbc1bd9272066011beaa8536482b59",
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
		bundleSizeMB: 108.6,
		totalSizeMB: 124.5,
		baseUrl: `${quranBase}/v2`,
		paths: {
			bundle: "/bundle.zip",
		},
		markers: MARKERS,
		checksums: {
			bundle:
				"sha256:e173ae8f57f445a5acb994d4639bf9e95fdddf6783eb66751bed88099119b20e",
			manifest:
				"sha256:3836d760519ee794c027db5295b95e463c61466846c8bf2acdfa727c6fd9e1a2",
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
		bundleSizeMB: 103.8,
		totalSizeMB: 116.9,
		baseUrl: `${quranBase}/v4`,
		paths: {
			bundle: "/bundle.zip",
		},
		markers: MARKERS,
		checksums: {
			bundle:
				"sha256:714bbfcd2a83bc719484340b99e7240932e631d8a5f6176fff893fb0d11e34b8",
			manifest:
				"sha256:c8401c7c8070baa96be8160ba170103d2686ab87d2c3704bf3e7b1a99816fced",
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
