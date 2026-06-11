import { describe, expect, test } from "bun:test";
import { Elysia } from "elysia";
import { env } from "@/config/env";
import { quranModule } from "@/modules/quran";

const app = new Elysia().group("/v3", (app) => app.use(quranModule));

// Fixed preview page set, identical across all versions (see quran-preview.ts).
const PREVIEW_PAGES = [1, 2, 302];

// biome-ignore lint/suspicious/noExplicitAny: test traverses dynamic JSON body
type AnyVersion = any;

async function getManifest() {
	const response = await app.handle(
		new Request("http://localhost/v3/quran/manifest"),
	);
	return { response, body: await response.json() };
}

describe("GET /v3/quran/manifest", () => {
	test("returns 200 with manifest", async () => {
		const { response, body } = await getManifest();
		expect(response.status).toBe(200);
		expect(body.manifestVersion).toBe(1);
	});

	test("returns all versions", async () => {
		const { body } = await getManifest();

		expect(body.versions).toBeArray();
		expect(body.versions.length).toBeGreaterThanOrEqual(1);

		const ids = body.versions.map((v: { id: string }) => v.id);
		expect(ids).toContain("v1");
		expect(ids).toContain("v2");
		expect(ids).toContain("v4");
	});

	test("each version has required top-level fields", async () => {
		const { body } = await getManifest();

		for (const version of body.versions as AnyVersion[]) {
			expect(version.id).toBeString();
			expect(version.name).toBeString();
			expect(version.totalPages).toBeNumber();
			expect(version.linesPerPage).toBeNumber();
			expect(version.markers).toBeArray();
			expect(version.resolutions).toBeArray();
			expect(version.resolutions.length).toBeGreaterThanOrEqual(1);
		}
	});

	test("each resolution entry is self-contained", async () => {
		const { body } = await getManifest();

		for (const version of body.versions as AnyVersion[]) {
			for (const res of version.resolutions) {
				expect(res.width).toBeNumber();
				expect(res.imageHeight).toBeNumber();
				expect(res.totalSizeMB).toBeNumber();
				expect(res.baseUrl).toBeString();
				expect(res.bundle).toBeDefined();
				expect(res.bundle.path).toBeString();
				expect(res.bundle.sizeMB).toBeNumber();
				expect(res.bundle.checksum).toBeString();
				expect(res.manifestChecksum).toBeString();
			}
		}
	});

	test("only v4 ships a dark bundle, on every resolution", async () => {
		const { body } = await getManifest();
		const byId = (id: string) =>
			(body.versions as AnyVersion[]).find((v) => v.id === id);

		for (const res of byId("v1").resolutions) {
			expect(res.darkBundle).toBeUndefined();
		}
		for (const res of byId("v2").resolutions) {
			expect(res.darkBundle).toBeUndefined();
		}
		for (const res of byId("v4").resolutions) {
			expect(res.darkBundle).toBeDefined();
			expect(res.darkBundle.path).toBeString();
			expect(res.darkBundle.sizeMB).toBeNumber();
			expect(res.darkBundle.checksum).toBeString();
		}
	});

	test("each resolution baseUrl uses CDN_URL and includes id + width", async () => {
		const { body } = await getManifest();

		for (const version of body.versions as AnyVersion[]) {
			for (const res of version.resolutions) {
				expect(res.baseUrl).toStartWith(env.CDN_URL);
				expect(res.baseUrl).toContain(`/quran/${version.id}/${res.width}`);
			}
		}
	});

	test("every resolution has previews for the fixed page set", async () => {
		const { body } = await getManifest();
		for (const version of body.versions as AnyVersion[]) {
			for (const res of version.resolutions) {
				expect(res.previews).toBeArray();
				expect(res.previews.map((p: { page: number }) => p.page)).toEqual(
					PREVIEW_PAGES,
				);
				for (const p of res.previews) {
					expect(p.path).toStartWith("/previews/");
					expect(p.width).toBeGreaterThan(0);
					expect(p.height).toBeGreaterThan(0);
				}
			}
		}
	});

	test("only v4 ships dark previews, same page set, on every resolution", async () => {
		const { body } = await getManifest();
		const byId = (id: string) =>
			(body.versions as AnyVersion[]).find((v) => v.id === id);

		for (const res of byId("v1").resolutions) {
			expect(res.darkPreviews).toBeUndefined();
		}
		for (const res of byId("v2").resolutions) {
			expect(res.darkPreviews).toBeUndefined();
		}
		for (const res of byId("v4").resolutions) {
			expect(res.darkPreviews).toBeArray();
			expect(res.darkPreviews.map((p: { page: number }) => p.page)).toEqual(
				PREVIEW_PAGES,
			);
			for (const p of res.darkPreviews) {
				expect(p.path).toMatch(/^\/previews\/\d{3}-dark\.\w+$/);
			}
		}
	});
});
