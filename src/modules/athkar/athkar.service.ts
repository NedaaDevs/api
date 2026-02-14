import { CACHE_TTL } from "@/config/constants";
import { env } from "@/config/env";
import { AppError, CODES, NotFoundError } from "@/shared/errors";
import { CacheService } from "@/shared/services/cache";

type ReciterCatalogEntry = {
	id: string;
	name: Record<string, string>;
	avatar: string;
	type: "clips" | "session" | "hybrid";
	totalSize: number;
	thikrCount: number;
	sampleUrl: string;
	manifestUrl: string;
	isDefault: boolean;
};

type ReciterCatalog = {
	version: number;
	reciters: ReciterCatalogEntry[];
};

type AudioFileEntry = {
	url: string;
	duration: number;
	size: number;
};

type ReciterManifest = {
	id: string;
	version: number;
	type: "clips" | "session" | "hybrid";
	files: Record<string, AudioFileEntry>;
	sessions?: Record<string, unknown>;
};

const manifestCache = new CacheService<ReciterManifest>({
	maxSize: 20,
	ttl: CACHE_TTL.ATHKAR_MANIFEST,
});

const recitersBase = `${env.CDN_URL}/reciters`;

const CATALOG: ReciterCatalog = {
	version: 1,
	reciters: [
		{
			id: "mishary-alafasy",
			name: {
				en: "Mishary Rashid Alafasy",
				ar: "مشاري راشد العفاسي",
				ur: "مشاری راشد العفاسی",
				ms: "Mishary Rashid Alafasy",
			},
			avatar: `${recitersBase}/mishary-alafasy/avatar.jpg`,
			type: "clips",
			totalSize: 16_863_836,
			thikrCount: 31,
			sampleUrl: `${recitersBase}/mishary-alafasy/shared/ayat-al-kursi.mp3`,
			manifestUrl: `${recitersBase}/mishary-alafasy/manifest.json`,
			isDefault: true,
		},
	],
};

// biome-ignore lint/complexity/noStaticOnlyClass: follows existing service pattern
export abstract class AthkarService {
	static getCatalog(): ReciterCatalog {
		return CATALOG;
	}

	static async getManifest(reciterId: string): Promise<ReciterManifest> {
		const reciter = CATALOG.reciters.find((r) => r.id === reciterId);
		if (!reciter) {
			throw new NotFoundError(
				`Reciter '${reciterId}' not found`,
				CODES.RESOURCE_NOT_FOUND,
			);
		}

		const cached = manifestCache.get(reciterId);
		if (cached) return cached;

		try {
			const response = await fetch(reciter.manifestUrl, {
				signal: AbortSignal.timeout(10000),
			});

			if (!response.ok) {
				throw new AppError(
					`Failed to fetch manifest for '${reciterId}'`,
					502,
					CODES.PROVIDER_ERROR,
				);
			}

			const manifest = (await response.json()) as ReciterManifest;
			manifestCache.set(reciterId, manifest);
			return manifest;
		} catch (error) {
			if (error instanceof AppError) throw error;
			throw new AppError(
				`Failed to fetch manifest for '${reciterId}'`,
				502,
				CODES.PROVIDER_ERROR,
			);
		}
	}
}
