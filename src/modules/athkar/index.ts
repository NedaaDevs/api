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
	.model({
		"Athkar.Catalog": ReciterCatalogResponse,
		"Athkar.Manifest": ReciterManifestResponse,
		"Athkar.IdParam": ReciterIdParam,
	})
	.get("/reciters", () => AthkarService.getCatalog(), {
		response: "Athkar.Catalog",
	})
	.get(
		"/reciters/:id/manifest",
		({ params }) => AthkarService.getManifest(params.id),
		{
			params: "Athkar.IdParam",
			response: "Athkar.Manifest",
		},
	);
