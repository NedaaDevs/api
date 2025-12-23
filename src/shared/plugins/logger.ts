import { existsSync, mkdirSync } from "node:fs";
import { pino, logger as pinoLogger } from "@bogeychan/elysia-logger";
import { Elysia } from "elysia";

import { env } from "@/config/env";

const isDev = env.NODE_ENV === "development";

if (!isDev && !existsSync("./logs")) {
	mkdirSync("./logs", { recursive: true });
}

export const logger = new Elysia({
	name: "logger",
})
	.use(
		pinoLogger({
			level: isDev ? "debug" : "info",
			...(isDev
				? {
						transport: {
							target: "pino-pretty",
							options: { colorize: true },
						},
					}
				: {
						stream: pino.multistream([
							process.stdout,
							pino.destination("./logs/app.log"),
						]),
					}),
			autoLogging: true,
		}),
	)
	.trace(
		{ as: "global" },
		({ context: { request }, onRequest, onHandle, onAfterResponse }) => {
			let path: string;
			let method: string;

			onRequest(() => {
				path = new URL(request.url).pathname;
				method = request.method;
				console.log(`→ ${method} ${path}`);
			});

			onHandle(({ onStop }) => {
				onStop(({ elapsed }) => {
					console.log(`  ⚡ handle: ${elapsed.toFixed(2)}ms`);
				});
			});

			onAfterResponse(({ onStop }) => {
				onStop(({ elapsed }) => {
					console.log(`← ${method} ${path} (${elapsed.toFixed(2)}ms)`);
				});
			});
		},
	);
