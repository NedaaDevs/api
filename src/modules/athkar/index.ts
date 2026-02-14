import { Elysia } from "elysia";
import {
	ReciterCatalogResponse,
	ReciterIdParam,
	ReciterManifestResponse,
} from "@/modules/athkar/athkar.schemas";
import { AthkarService } from "@/modules/athkar/athkar.service";

export const athkarModule = new Elysia({
	name: "athkarModule",
	prefix: "/athkar",
	detail: {
		tags: ["Athkar"],
	},
})
	.get("/reciters", () => AthkarService.getCatalog(), {
		response: ReciterCatalogResponse,
	})
	.get(
		"/reciters/:id/manifest",
		({ params }) => AthkarService.getManifest(params.id),
		{
			params: ReciterIdParam,
			response: ReciterManifestResponse,
		},
	);
