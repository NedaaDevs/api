import { Redis } from "ioredis";

// BullMQ requires maxRetriesPerRequest: null on its connections.
export const createConnection = (url: string): Redis =>
	new Redis(url, { maxRetriesPerRequest: null });
