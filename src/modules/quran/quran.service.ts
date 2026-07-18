import { env } from "@/config/env";
import { audio } from "@/modules/quran/quran.audio";
import { EDITION_IDENTITY } from "@/modules/quran/quran.editions";
import publishData from "@/modules/quran/quran.publish.json";
import type {
	QuranContent,
	QuranEdition,
	QuranManifest,
	QuranOrnaments,
} from "./quran.schemas";

const quranBase = `${env.CDN_URL}/quran`;

type EditionPublish = Pick<
	QuranEdition,
	"images" | "meta" | "previews" | "darkPreviews"
>;
const publish = publishData as {
	editions: Record<string, EditionPublish>;
	ornaments: QuranOrnaments;
	content?: QuranContent;
};

// Merge identity with generated publish data. Editions without publish data yet
// (uploader not run) are dropped, so the manifest only advertises live artifacts.
const editions = EDITION_IDENTITY.flatMap((identity): QuranEdition[] => {
	const data = publish.editions[identity.id];
	return data ? [{ ...identity, ...data }] : [];
});

const MANIFEST: QuranManifest = {
	manifestSchema: 2,
	baseUrl: quranBase,
	editions,
	ornaments: publish.ornaments,
	// Omitted entirely until quran.publish.json carries a content block.
	...(publish.content && { content: publish.content }),
	audio,
};

// biome-ignore lint/complexity/noStaticOnlyClass: follows existing service pattern
export abstract class QuranService {
	static getManifest(): QuranManifest {
		return MANIFEST;
	}
}
