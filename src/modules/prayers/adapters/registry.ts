import type {
	AdapterMeta,
	PrayerTimesAdapter,
} from "@/modules/prayers/adapters/base.adapter";
import { NotFoundError } from "@/shared/errors";

// Auto-discover adapters using glob import
import adapterModules from "./*.adapter.ts";

const adapters = new Map<string, PrayerTimesAdapter>();

type AdapterModule = { default?: new () => PrayerTimesAdapter };

export const initAdapter = async () => {
	for (const mod of adapterModules as AdapterModule[]) {
		// Skip base adapter (no default export)
		if (!mod.default) continue;
		const adapter = new mod.default();
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
