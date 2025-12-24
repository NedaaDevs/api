import { spawn } from "bun";
import { globImportPlugin } from "bun-plugin-glob-import";
import { watch } from "fs";

const isCompile = process.argv.includes("--compile");
const isWatch = process.argv.includes("--watch");

async function build() {
	const result = await Bun.build({
		entrypoints: ["./src/index.ts"],
		outdir: "./dist",
		target: "bun",
		minify: !isWatch,
		plugins: [globImportPlugin()],
	});

	if (!result.success) {
		console.error("Build failed:", result.logs);
		return false;
	}
	return true;
}

if (isCompile) {
	if (await build()) {
		const proc = spawn(
			["bun", "build", "--compile", "--outfile", "server", "./dist/index.js"],
			{ stdout: "inherit", stderr: "inherit" },
		);
		await proc.exited;
		console.log("Compiled: ./server");
	}
} else if (isWatch) {
	// Dev mode: build, run, and watch for changes
	if (!(await build())) process.exit(1);

	let serverProc = spawn(["bun", "run", "./dist/index.js"], {
		stdout: "inherit",
		stderr: "inherit",
	});

	console.log("Watching for changes...");

	watch("./src", { recursive: true }, async (event, filename) => {
		if (!filename?.endsWith(".ts")) return;
		console.log(`\n[${event}] ${filename} - rebuilding...`);

		serverProc.kill();
		if (await build()) {
			serverProc = spawn(["bun", "run", "./dist/index.js"], {
				stdout: "inherit",
				stderr: "inherit",
			});
		}
	});
} else {
	if (await build()) {
		console.log("Bundled: ./dist");
	}
}
