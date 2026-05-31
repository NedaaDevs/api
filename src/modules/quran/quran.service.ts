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
				"sha256:f62e3a42a76be2a0c60e7159262254f342d1e6532d4fdeeb7e094d195399e18d",
		},
		totalSizeMB: 110.8,
		markers: MARKERS,
		manifestChecksum:
			"sha256:175cdabeb5f39187fbfef267d3199104a81dc4fa7b0e81b350a864c6e42e44fd",
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
			sizeMB: 108.7,
			checksum:
				"sha256:a24d3529bb157ea71df8002ac732b4129ab72975fd802b34fa527986841bb6ce",
		},
		totalSizeMB: 124.1,
		markers: MARKERS,
		manifestChecksum:
			"sha256:f14ae85a1dbd99c13fe42fad506d96f1174ffd0846c241f306abca0ca2f2f400",
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
		totalSizeMB: 109.4,
		markers: MARKERS,
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
