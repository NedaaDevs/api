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
				"sha256:94970f9680f616c6522c8ee717be67ba670dda6c3421c81874f022cfd800dd24",
			manifest:
				"sha256:c88c712e8c23ee5a2efa5d3606c30dfcedeca5cc642db828515dfc2de520cc98",
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
		bundleSizeMB: 109.2,
		totalSizeMB: 125.0,
		baseUrl: `${quranBase}/v2`,
		paths: {
			bundle: "/bundle.zip",
		},
		markers: MARKERS,
		checksums: {
			bundle:
				"sha256:df1de924110f9432a27af8743889da8a4f7c1ca81f02b4c14781cae04676b7e4",
			manifest:
				"sha256:ee92eba91d09b173becab51e3ab110f647b1490d5257d1b9765d52c6fbc8887b",
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
		bundleSizeMB: 91.8,
		totalSizeMB: 109.8,
		baseUrl: `${quranBase}/v4`,
		paths: {
			bundle: "/bundle.zip",
		},
		markers: MARKERS,
		checksums: {
			bundle:
				"sha256:0c779c426613e5b9f1b164c5a0cae60208f7fec7faa62beaa0241292299bc9a3",
			manifest:
				"sha256:27e0f718b9f5cb9c458ad308031d7891241d0c7a035ed4b9f5e883464809d85a",
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
