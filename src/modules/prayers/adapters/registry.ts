import { readdir } from "node:fs/promises";
import { join } from "node:path";
import type {
	AdapterMeta,
	PrayerTimesAdapter,
} from "@/modules/prayers/adapters/base.adapter";
import { NotFoundError } from "@/shared/errors";

const adapters = new Map<string, PrayerTimesAdapter>();

export const initAdapter = async () => {
	const adapterDir = import.meta.dir;
	const files = await readdir(adapterDir);

	const adapterFiles = files.filter(
		(f) => f.endsWith(".adapter.ts") && f !== "base.adapter.ts",
	);

	if (!adapterFiles.length) {
		console.warn("No Adapters found");
	}

	for (const file of adapterFiles) {
		const modulePath = join(adapterDir, file);
		const { default: AdapterClass } = await import(modulePath);
		const adapter: PrayerTimesAdapter = new AdapterClass();
		adapters.set(adapter.meta.id, adapter);
	}

	console.log(
		`Loaded ${adapters.size} prayer adapters: ${[...adapters.keys()].join(", ")}`,
	);
};

/**
 * Get adapter by ID
 * @returns PrayerTimesAdapter
 * @throws NotFoundError if adapter not found
 */
export const getAdapter = (id: string): PrayerTimesAdapter => {
	const adapter = adapters.get(id);

	if (!adapter) {
		throw new NotFoundError(
			`Adapter '${id}' not found. Available: ${[...adapters.keys()].join(", ")}`,
		);
	}

	return adapter;
};

/**
 * List all adapter metadata (for /providers endpoint)
 */
export function listAdapters(): AdapterMeta[] {
	return [...adapters.values()].map((a) => a.meta);
}

/**
 * Get default adapter (first registered)
 * @throws Error if no adapters registered
 */
export function getDefaultAdapter(): PrayerTimesAdapter {
	const first = adapters.values().next().value;
	if (!first) {
		throw new Error("No adapters registered");
	}
	return first;
}
