import { Elysia } from "elysia";
import { QuranManifestResponse } from "@/modules/quran/quran.schemas";
import { QuranService } from "@/modules/quran/quran.service";

export const quranModule = new Elysia({
	name: "quranModule",
	prefix: "/quran",
	detail: {
		tags: ["Quran"],
	},
})
	.model({ "Quran.Manifest": QuranManifestResponse })
	.get("/manifest", () => QuranService.getManifest(), {
		response: "Quran.Manifest",
	});
