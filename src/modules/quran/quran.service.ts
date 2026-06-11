import { env } from "@/config/env";
import type { QuranManifest, QuranVersion } from "./quran.schemas";

const quranBase = `${env.CDN_URL}/quran`;

const MARKERS = ["marker-light", "marker-dark", "marker-sepia", "surah-frame"];

// NOTE: resolution bundle values (sizeMB/checksum/manifestChecksum) are produced
// by scripts/upload-quran-to-r2.ts and refreshed on every re-upload. Run
// scripts/verify-quran-manifest.ts to confirm these match R2.
const VERSIONS: QuranVersion[] = [
	{
		id: "v1",
		name: "Madinah Mushaf V1",
		yearHijri: 1405,
		yearGregorian: 1984,
		totalPages: 604,
		linesPerPage: 15,
		markers: MARKERS,
		resolutions: [
			{
				width: 1440,
				imageHeight: 232,
				baseUrl: `${quranBase}/v1/1440`,
				bundle: {
					path: "/bundle.zip",
					sizeMB: 97.7,
					checksum:
						"sha256:936a680201101bf873c6481bd8aed4166e1674616f28c326394f933e36a19539",
				},
				totalSizeMB: 110.8,
				previews: [
					{ page: 1, path: "/previews/001.webp", width: 1440, height: 3480 },
					{ page: 2, path: "/previews/002.webp", width: 1440, height: 3480 },
					{ page: 302, path: "/previews/302.webp", width: 1440, height: 3480 },
				],
				manifestChecksum:
					"sha256:0d0457c78bb7bf12f0059a3ea4a29935edc7d79ca64ed84bb05d111745c0ca92",
			},
			{
				width: 2160,
				imageHeight: 348,
				baseUrl: `${quranBase}/v1/2160`,
				bundle: {
					path: "/bundle.zip",
					sizeMB: 153.9,
					checksum:
						"sha256:a5b91420cc77c0dbcf6c06c06d6b50a14bc04762ae9ac220ff27d12af1b0a3a9",
				},
				totalSizeMB: 170.4,
				previews: [
					{ page: 1, path: "/previews/001.webp", width: 2160, height: 5220 },
					{ page: 2, path: "/previews/002.webp", width: 2160, height: 5220 },
					{ page: 302, path: "/previews/302.webp", width: 2160, height: 5220 },
				],
				manifestChecksum:
					"sha256:9ed8220245db277b43bb3c5e261715e595c49a4d2226b81639397936c3028f1b",
			},
		],
		published: true,
	},
	{
		id: "v2",
		name: "Madinah Mushaf V2",
		yearHijri: 1420,
		yearGregorian: 1999,
		totalPages: 604,
		linesPerPage: 15,
		markers: MARKERS,
		resolutions: [
			{
				width: 1440,
				imageHeight: 232,
				baseUrl: `${quranBase}/v2/1440`,
				bundle: {
					path: "/bundle.zip",
					sizeMB: 108.8,
					checksum:
						"sha256:5621039f44ab81c555f8a57ac0f3ad5cb68be893470269a66c90678ef61075f7",
				},
				totalSizeMB: 124.1,
				previews: [
					{ page: 1, path: "/previews/001.webp", width: 1440, height: 3480 },
					{ page: 2, path: "/previews/002.webp", width: 1440, height: 3480 },
					{ page: 302, path: "/previews/302.webp", width: 1440, height: 3480 },
				],
				manifestChecksum:
					"sha256:14ddc6ce64f8020ba6682a2959ea26daf71caa05411b07943857e2bb614fb50b",
			},
			{
				width: 2160,
				imageHeight: 348,
				baseUrl: `${quranBase}/v2/2160`,
				bundle: {
					path: "/bundle.zip",
					sizeMB: 173.4,
					checksum:
						"sha256:39ed09fa3561edb1cdb46d685f7991ea688d34d7bf206eeb66ecd27f86579cc2",
				},
				totalSizeMB: 189.1,
				previews: [
					{ page: 1, path: "/previews/001.webp", width: 2160, height: 5220 },
					{ page: 2, path: "/previews/002.webp", width: 2160, height: 5220 },
					{ page: 302, path: "/previews/302.webp", width: 2160, height: 5220 },
				],
				manifestChecksum:
					"sha256:634f36d9a5d07e6ed583d92420fe9417acdbcbc5f67cadd35ef66314e7fbe1b3",
			},
		],
		published: true,
	},
	{
		id: "v4",
		name: "Madinah Mushaf V4",
		yearHijri: 1439,
		yearGregorian: 2017,
		totalPages: 604,
		linesPerPage: 15,
		markers: MARKERS,
		resolutions: [
			{
				width: 1440,
				imageHeight: 232,
				baseUrl: `${quranBase}/v4/1440`,
				bundle: {
					path: "/bundle.zip",
					sizeMB: 92.0,
					checksum:
						"sha256:7c8c0923211bc87a71e7b71114e50a4196bd3f12a3b2bbcc57e595c950544449",
				},
				darkBundle: {
					path: "/bundle-dark.zip",
					sizeMB: 92.4,
					checksum:
						"sha256:d390156e6a8ddd0b4424892804a0bb8f4cf099534c2898680eeb9de6f3c8a4d7",
				},
				totalSizeMB: 109.4,
				previews: [
					{ page: 1, path: "/previews/001.png", width: 1440, height: 3480 },
					{ page: 2, path: "/previews/002.png", width: 1440, height: 3480 },
					{ page: 302, path: "/previews/302.png", width: 1440, height: 3480 },
				],
				darkPreviews: [
					{
						page: 1,
						path: "/previews/001-dark.webp",
						width: 1440,
						height: 3480,
					},
					{
						page: 2,
						path: "/previews/002-dark.webp",
						width: 1440,
						height: 3480,
					},
					{
						page: 302,
						path: "/previews/302-dark.png",
						width: 1440,
						height: 3480,
					},
				],
				manifestChecksum:
					"sha256:dc603c43942ad4488984b22725f4a41f41ec48fc146aba9f7d989bc0af9dfd17",
			},
			{
				width: 2160,
				imageHeight: 348,
				baseUrl: `${quranBase}/v4/2160`,
				bundle: {
					path: "/bundle.zip",
					sizeMB: 155.7,
					checksum:
						"sha256:14dc4871235d9756b22ca3c8a03f64b019c6512fc72b96cfd8721f4fd4899991",
				},
				darkBundle: {
					path: "/bundle-dark.zip",
					sizeMB: 146.0,
					checksum:
						"sha256:109e3633fcaa647095be16c819f6da79211b7dc51b43f7935ab80239f4656548",
				},
				totalSizeMB: 172.4,
				previews: [
					{ page: 1, path: "/previews/001.webp", width: 2160, height: 5220 },
					{ page: 2, path: "/previews/002.webp", width: 2160, height: 5220 },
					{ page: 302, path: "/previews/302.webp", width: 2160, height: 5220 },
				],
				darkPreviews: [
					{
						page: 1,
						path: "/previews/001-dark.webp",
						width: 2160,
						height: 5220,
					},
					{
						page: 2,
						path: "/previews/002-dark.webp",
						width: 2160,
						height: 5220,
					},
					{
						page: 302,
						path: "/previews/302-dark.webp",
						width: 2160,
						height: 5220,
					},
				],
				manifestChecksum:
					"sha256:0b11b50083cb18e89572ada3fd49a6cba06d660d9170e51e97da74ffd12b6ce3",
			},
		],
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
