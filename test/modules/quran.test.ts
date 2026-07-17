import { describe, expect, test } from "bun:test";
import { Elysia } from "elysia";
import { env } from "@/config/env";
import { quranModule } from "@/modules/quran";
import { QuranManifestResponse } from "@/modules/quran/quran.schemas";

const app = new Elysia().group("/v3", (app) => app.use(quranModule));

// Fixed preview page set, identical across all versions (see quran-preview.ts).
const PREVIEW_PAGES = [1, 2, 302];

const getManifest = async () => {
	const response = await app.handle(
		new Request("http://localhost/v3/quran/manifest"),
	);
	// body is dynamic JSON (any) — kept loose so edition/ornament access is free.
	const body = await response.json();
	return { response, body };
};

const byId = (body: { editions: { id: string }[] }, id: string) =>
	// biome-ignore lint/suspicious/noExplicitAny: dynamic manifest JSON under test
	(body.editions as any[]).find((e) => e.id === id);

describe("GET /v3/quran/manifest", () => {
	test("returns 200 with the new manifest shape", async () => {
		const { response, body } = await getManifest();
		expect(response.status).toBe(200);
		expect(body.manifestSchema).toBe(2);
		expect(body.baseUrl).toStartWith(env.CDN_URL);
		expect(body.baseUrl).toEndWith("/quran");
	});

	test("returns all editions", async () => {
		const { body } = await getManifest();
		expect(body.editions).toBeArray();
		const ids = body.editions.map((e: { id: string }) => e.id);
		expect(ids).toContain("v1");
		expect(ids).toContain("v2");
		expect(ids).toContain("v4");
	});

	test("each edition has identity + image/meta layers", async () => {
		const { body } = await getManifest();
		for (const e of body.editions) {
			expect(e.id).toBeString();
			expect(e.name).toBeString();
			expect(e.imageType).toBe("line");
			expect(e.resolution).toBeNumber();
			expect(e.yearHijri).toBeNumber();
			expect(e.yearGregorian).toBeNumber();
			expect(e.linesPerPage).toBeNumber();
			expect(e.published).toBeBoolean();

			// Images layer (per theme), version-tagged + integrity-hashed.
			expect(e.images.version).toBeString();
			expect(e.images.pages).toBeNumber();
			expect(e.images.light.url).toContain(`${e.id}/`);
			expect(e.images.light.bytes).toBeGreaterThan(0);
			expect(e.images.light.sha256).toBeString();

			// Meta layer mirrors bounds.db and declares its image floor.
			expect(e.meta.version).toBeString();
			expect(e.meta.schema).toBeNumber();
			expect(e.meta.requiresImages).toBeString();
			expect(e.meta.url).toContain(`${e.id}/`);
			expect(e.meta.sha256).toBeString();
		}
	});

	test("only v4 ships a dark image set", async () => {
		const { body } = await getManifest();
		expect(byId(body, "v1").images.dark).toBeUndefined();
		expect(byId(body, "v2").images.dark).toBeUndefined();

		const dark = byId(body, "v4").images.dark;
		expect(dark.url).toContain("images-dark");
		expect(dark.bytes).toBeGreaterThan(0);
		expect(dark.sha256).toBeString();
	});

	test("artifact urls resolve against baseUrl (relative paths)", async () => {
		const { body } = await getManifest();
		for (const e of body.editions) {
			expect(e.images.light.url).not.toStartWith("http");
			expect(e.images.light.url).not.toStartWith("/");
			expect(e.meta.url).not.toStartWith("/");
		}
	});

	test("every edition has previews for the fixed page set", async () => {
		const { body } = await getManifest();
		for (const e of body.editions) {
			expect(e.previews.map((p: { page: number }) => p.page)).toEqual(
				PREVIEW_PAGES,
			);
			for (const p of e.previews) {
				expect(p.url).toContain(`${e.id}/`);
				expect(p.url).toContain("/previews/");
				expect(p.width).toBeGreaterThan(0);
				expect(p.height).toBeGreaterThan(0);
			}
		}
	});

	test("only v4 ships dark previews, same page set", async () => {
		const { body } = await getManifest();
		expect(byId(body, "v1").darkPreviews).toBeUndefined();
		expect(byId(body, "v2").darkPreviews).toBeUndefined();

		const v4Dark = byId(body, "v4").darkPreviews;
		expect(v4Dark.map((p: { page: number }) => p.page)).toEqual(PREVIEW_PAGES);
		for (const p of v4Dark) {
			expect(p.url).toMatch(/\/previews\/\d{3}-dark\.\w+$/);
		}
	});

	test("ornaments expose the three categories", async () => {
		const { body } = await getManifest();
		for (const cat of ["ayahMarker", "surahFrame", "pageHolder"]) {
			expect(body.ornaments[cat].default).toBeString();
			expect(body.ornaments[cat].options).toBeArray();
		}
	});

	test("bundled baseline default is the nedaa style for every category", async () => {
		const { body } = await getManifest();
		for (const cat of ["ayahMarker", "surahFrame", "pageHolder"]) {
			expect(body.ornaments[cat].default).toBe("nedaa");
			// The bundled default is never a downloadable option.
			expect(
				body.ornaments[cat].options.some(
					(o: { id: string }) => o.id === "nedaa",
				),
			).toBe(false);
		}
	});

	test("marker ornaments are scoped to their own edition", async () => {
		const { body } = await getManifest();
		const group = body.ornaments.ayahMarker;
		// Each version contributes a native pack compatible with itself only.
		for (const id of ["v1", "v2", "v4"]) {
			const opt = group.options.find((o: { id: string }) => o.id === id);
			expect(opt.editions).toEqual([id]);
			expect(opt.resolution).toBeNumber();
			expect(opt.sha256).toBeString();
			expect(group.defaultByEdition[id]).toBe(id);
		}
	});

	test("surah frame is one shared classic pack for every edition", async () => {
		const { body } = await getManifest();
		const group = body.ornaments.surahFrame;
		expect(group.options.map((o: { id: string }) => o.id)).toEqual(["classic"]);
		const opt = group.options[0];
		// Cross-edition: no editions scoping on the option itself.
		expect(opt.editions).toBeUndefined();
		expect(opt.sha256).toBeString();
		for (const id of ["v1", "v2", "v4"]) {
			expect(group.defaultByEdition[id]).toBe("classic");
		}
	});

	test("manifest schema accepts an optional top-level content layer", async () => {
		// quran.db is shared across editions, so `content` lives at the manifest
		// top level. It is absent from the live manifest until an upload populates
		// quran.publish.json — so validate the SHAPE via the same response model
		// the real route uses, rather than asserting presence on the live manifest.
		const probe = new Elysia()
			.model({ "Quran.Manifest": QuranManifestResponse })
			.get(
				"/m",
				() => ({
					manifestSchema: 2,
					baseUrl: `${env.CDN_URL}/quran`,
					editions: [],
					ornaments: {
						ayahMarker: { default: "nedaa", options: [] },
						surahFrame: { default: "nedaa", options: [] },
						pageHolder: { default: "nedaa", options: [] },
					},
					content: {
						version: "2026-06-16",
						schema: 2,
						url: "content/quran-2026-06-16.zip",
						bytes: 4096,
						sha256: "abc123",
					},
				}),
				{ response: "Quran.Manifest" },
			);
		const res = await probe.handle(new Request("http://localhost/m"));
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.content.url).toBe("content/quran-2026-06-16.zip");
		expect(body.content.schema).toBe(2);
		expect(body.content.sha256).toBe("abc123");
	});
});
