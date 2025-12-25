import { pino, logger as pinoLogger } from "@bogeychan/elysia-logger";
import { Elysia } from "elysia";

import { env } from "@/config/env";

const isDev = env.NODE_ENV === "development";

const devTrace = new Elysia({
	name: "devTrace",
}).trace(
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
						stream: pino.multistream([{ stream: process.stdout }]),
					}),
			autoLogging: true,
		}),
	)
	.use(isDev ? devTrace : (app) => app);
