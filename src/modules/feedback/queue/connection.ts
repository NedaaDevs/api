import { Redis } from "ioredis";

interface ConnectionOpts {
	// Producer connections use enableOfflineQueue: false so queue.add rejects
	// fast when Valkey is down instead of buffering/hanging the HTTP request.
	// Worker connections keep the default (blocking reads need the offline queue).
	failFast?: boolean;
}

// BullMQ requires maxRetriesPerRequest: null on its connections.
export const createConnection = (
	url: string,
	{ failFast = false }: ConnectionOpts = {},
): Redis => {
	const conn = new Redis(url, {
		maxRetriesPerRequest: null,
		enableOfflineQueue: !failFast,
	});
	conn.on("error", (err) => {
		console.error("[feedback] redis connection error:", err.message);
	});
	return conn;
};
