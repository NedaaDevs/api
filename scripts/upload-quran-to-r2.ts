#!/usr/bin/env bun

/**
 * Bundle and upload Quran assets to Cloudflare R2.
 *
 * Creates a bundle.zip per version containing lines/, bounds.db, and markers/,
 * then uploads it to R2.
 *
 * Prerequisites: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY in .env
 *
 * Usage:
 *   bun scripts/upload-quran-to-r2.ts v2
 *   bun scripts/upload-quran-to-r2.ts --all
 *   bun scripts/upload-quran-to-r2.ts v2 --source ../quran-image-generator/output
 */

import { createHash } from "node:crypto";
import { stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { S3Client } from "bun";

// --- Config ---

const VERSIONS = ["v1", "v2", "v4"];
const MAX_RETRIES = 3;

// --- Terminal colors ---

const c = {
	reset: "\x1b[0m",
	bold: "\x1b[1m",
	dim: "\x1b[2m",
	green: Bun.color("green", "ansi") ?? "",
	red: Bun.color("red", "ansi") ?? "",
	yellow: Bun.color("yellow", "ansi") ?? "",
	cyan: Bun.color("cyan", "ansi") ?? "",
	magenta: Bun.color("magenta", "ansi") ?? "",
};

// --- R2 Client ---

function createR2(): S3Client {
	const accountId = process.env.R2_ACCOUNT_ID;
	const accessKeyId = process.env.R2_ACCESS_KEY_ID;
	const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

	if (!accountId || !accessKeyId || !secretAccessKey) {
		console.error(
			`${c.red}Missing R2 credentials. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY in .env${c.reset}`,
		);
		process.exit(1);
	}

	return new S3Client({
		accessKeyId,
		secretAccessKey,
		bucket: "nedaa-cdn",
		endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
	});
}

// --- Helpers ---

function formatSize(bytes: number): string {
	if (bytes < 1024) return `${bytes}B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

async function sha256File(filepath: string): Promise<string> {
	const buffer = await Bun.file(filepath).arrayBuffer();
	const hash = createHash("sha256").update(Buffer.from(buffer)).digest("hex");
	return `sha256:${hash}`;
}

async function dirExists(path: string): Promise<boolean> {
	try {
		return (await stat(path)).isDirectory();
	} catch {
		return false;
	}
}

async function r2Put(
	r2: S3Client,
	key: string,
	filepath: string,
): Promise<void> {
	const content = Bun.file(filepath);

	for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
		try {
			await r2.file(key).write(content, { type: "application/zip" });
			return;
		} catch (err) {
			if (attempt < MAX_RETRIES) {
				const delay = attempt * 1000;
				console.error(
					`\n  ${c.yellow}Retry ${attempt}/${MAX_RETRIES} for ${key} (waiting ${delay}ms)${c.reset}`,
				);
				await Bun.sleep(delay);
			} else {
				throw new Error(
					`Upload failed for ${key}: ${err instanceof Error ? err.message : err}`,
				);
			}
		}
	}
}

// --- Bundle & Upload ---

async function getDirSize(dir: string): Promise<number> {
	const proc = Bun.spawn(["du", "-sk", dir], { stdout: "pipe" });
	const output = await new Response(proc.stdout).text();
	return Number.parseInt(output.split("\t")[0], 10) * 1024;
}

async function uploadVersion(
	r2: S3Client,
	version: string,
	sourceBase: string,
) {
	const sourceDir = join(sourceBase, version, "1440", "png");
	if (!(await dirExists(sourceDir))) {
		console.error(`${c.red}Source not found: ${sourceDir}${c.reset}`);
		process.exit(1);
	}

	console.log(
		`\n${c.bold}${c.magenta}  Bundling ${version}${c.reset} from ${c.cyan}${sourceDir}${c.reset}\n`,
	);

	// Calculate total (extracted) size
	const totalBytes = await getDirSize(sourceDir);
	console.log(
		`  ${c.dim}Total size (extracted):${c.reset} ${formatSize(totalBytes)}`,
	);

	// Create zip
	const zipPath = resolve(sourceBase, `${version}-bundle.zip`);
	console.log(`  ${c.dim}Creating bundle.zip...${c.reset}`);

	const zipProc = Bun.spawn(
		["zip", "-r", "-0", zipPath, "lines", "bounds.db", "markers"],
		{ cwd: resolve(sourceDir), stdout: "ignore", stderr: "pipe" },
	);
	const zipStderr = await new Response(zipProc.stderr).text();
	const zipExitCode = await zipProc.exited;

	if (zipExitCode !== 0) {
		console.error(
			`${c.red}zip failed (exit ${zipExitCode}): ${zipStderr}${c.reset}`,
		);
		process.exit(1);
	}

	const zipSize = (await stat(zipPath)).size;
	const bundleChecksum = await sha256File(zipPath);

	console.log(
		`  ${c.green}bundle.zip${c.reset} ${formatSize(zipSize)} ${c.dim}${bundleChecksum.slice(0, 20)}...${c.reset}`,
	);

	// Upload
	const key = `quran/${version}/bundle.zip`;
	console.log(`  ${c.dim}Uploading to ${key}...${c.reset}`);
	await r2Put(r2, key, zipPath);
	console.log(`  ${c.green}Uploaded!${c.reset}`);

	// Cleanup zip
	await Bun.file(zipPath).delete();

	// Manifest checksum
	const manifestHash = createHash("sha256")
		.update(JSON.stringify({ bundle: bundleChecksum }))
		.digest("hex");

	// Summary
	const bundleSizeMB = (zipSize / (1024 * 1024)).toFixed(1);
	const totalSizeMB = (totalBytes / (1024 * 1024)).toFixed(1);

	console.log(`\n${c.bold}  Summary for ${version}${c.reset}`);
	console.log(`  ${c.dim}Bundle size:${c.reset}    ${formatSize(zipSize)}`);
	console.log(`  ${c.dim}Total size:${c.reset}     ${formatSize(totalBytes)}`);

	console.log(`\n  ${c.bold}Values for quran.service.ts:${c.reset}`);
	console.log(`  ${c.cyan}bundleSizeMB: ${bundleSizeMB},${c.reset}`);
	console.log(`  ${c.cyan}totalSizeMB: ${totalSizeMB},${c.reset}`);
	console.log(`  ${c.cyan}bundle: "${bundleChecksum}",${c.reset}`);
	console.log(`  ${c.cyan}manifest: "sha256:${manifestHash}",${c.reset}`);
}

// --- Main ---

async function main() {
	console.log(`\n${c.bold}${c.magenta}  Quran R2 Bundle Uploader${c.reset}\n`);

	const { values, positionals } = parseArgs({
		args: Bun.argv.slice(2),
		options: {
			all: { type: "boolean", default: false },
			source: {
				type: "string",
				short: "s",
				default: "../quran-image-generator/output",
			},
		},
		strict: false,
		allowPositionals: true,
	});

	const r2 = createR2();
	const sourceBase = values.source as string;

	const versionsToUpload = values.all
		? VERSIONS
		: positionals.filter((v) => VERSIONS.includes(v));

	if (versionsToUpload.length === 0) {
		console.error(
			`${c.red}Specify a version (${VERSIONS.join(", ")}) or use --all${c.reset}`,
		);
		console.error(
			`${c.dim}Usage: bun scripts/upload-quran-to-r2.ts v2${c.reset}`,
		);
		console.error(
			`${c.dim}       bun scripts/upload-quran-to-r2.ts --all${c.reset}`,
		);
		process.exit(1);
	}

	for (const version of versionsToUpload) {
		await uploadVersion(r2, version, sourceBase);
	}

	console.log(`\n${c.green}${c.bold}  Done!${c.reset}\n`);
}

main().catch((err) => {
	console.error(`\n${c.red}  Error: ${err.message}${c.reset}\n`);
	process.exit(1);
});
