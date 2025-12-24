import { globImportPlugin } from "bun-plugin-glob-import";

const isCompile = process.argv.includes("--compile");

// Bundle with glob plugin
const result = await Bun.build({
	entrypoints: ["./src/index.ts"],
	outdir: "./dist",
	target: "bun",
	minify: {
		whitespace: true,
		syntax: true,
	},
	plugins: [globImportPlugin()],
});

if (!result.success) {
	console.error("Build failed:", result.logs);
	process.exit(1);
}

if (isCompile) {
	// Compile bundled output to binary (CLI-only feature)
	const proc = Bun.spawn(
		["bun", "build", "--compile", "--outfile", "server", "./dist/index.js"],
		{ stdout: "inherit", stderr: "inherit" },
	);
	await proc.exited;
	console.log("Compiled: ./server");
} else {
	console.log("Bundled: ./dist");
}
