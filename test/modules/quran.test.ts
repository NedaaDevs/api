import { describe, expect, test } from "bun:test";
import { Elysia } from "elysia";
import { env } from "@/config/env";
import { quranModule } from "@/modules/quran";

const app = new Elysia().group("/v3", (app) => app.use(quranModule));

describe("GET /v3/quran/manifest", () => {
	test("returns 200 with manifest", async () => {
		const response = await app.handle(
			new Request("http://localhost/v3/quran/manifest"),
		);
		expect(response.status).toBe(200);

		const body = await response.json();
		expect(body.manifestVersion).toBe(1);
	});

	test("returns all versions", async () => {
		const response = await app.handle(
			new Request("http://localhost/v3/quran/manifest"),
		);
		const body = await response.json();

		expect(body.versions).toBeArray();
		expect(body.versions.length).toBeGreaterThanOrEqual(1);

		const ids = body.versions.map((v: { id: string }) => v.id);
		expect(ids).toContain("v1");
		expect(ids).toContain("v2");
		expect(ids).toContain("v4");
	});

	test("each version has required fields", async () => {
		const response = await app.handle(
			new Request("http://localhost/v3/quran/manifest"),
		);
		const body = await response.json();

		for (const version of body.versions) {
			expect(version.id).toBeString();
			expect(version.name).toBeString();
			expect(version.totalPages).toBeNumber();
			expect(version.linesPerPage).toBeNumber();
			expect(version.imageWidth).toBeNumber();
			expect(version.imageHeight).toBeNumber();
			expect(version.totalSizeMB).toBeNumber();
			expect(version.baseUrl).toBeString();
			expect(version.bundle).toBeDefined();
			expect(version.bundle.path).toBeString();
			expect(version.bundle.sizeMB).toBeNumber();
			expect(version.bundle.checksum).toBeString();
			expect(version.markers).toBeArray();
			expect(version.manifestChecksum).toBeString();
		}
	});

	test("only v4 ships a dark bundle, mirroring the light bundle shape", async () => {
		const response = await app.handle(
			new Request("http://localhost/v3/quran/manifest"),
		);
		const body = await response.json();

		const byId = (id: string) =>
			body.versions.find((v: { id: string }) => v.id === id);

		expect(byId("v1").darkBundle).toBeUndefined();
		expect(byId("v2").darkBundle).toBeUndefined();

		const v4Dark = byId("v4").darkBundle;
		expect(v4Dark).toBeDefined();
		expect(v4Dark.path).toBeString();
		expect(v4Dark.sizeMB).toBeNumber();
		expect(v4Dark.checksum).toBeString();
	});

	test("baseUrl uses CDN_URL", async () => {
		const response = await app.handle(
			new Request("http://localhost/v3/quran/manifest"),
		);
		const body = await response.json();

		for (const version of body.versions) {
			expect(version.baseUrl).toStartWith(env.CDN_URL);
			expect(version.baseUrl).toContain(`/quran/${version.id}`);
		}
	});
});
