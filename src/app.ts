import { cors } from "@elysiajs/cors";
import { openapi } from "@elysiajs/openapi";
import { Elysia } from "elysia";

// Modules
import { healthModule } from "@/modules/health";

// Plugins
import { errorHandler } from "@/shared/plugins/error-handler";

export const app = new Elysia()
	.use(cors())
	.use(
		openapi({
			enabled: true,
			path: "/docs",
			documentation: {
				info: {
					title: "Nedaa API",
					version: "1.0.0",
				},
				tags: [
					{
						name: "Health",
						description: "Health check endpoint",
					},
				],
			},
		}),
	)
	.use(errorHandler)
	.group("/v3", (app) => app.use(healthModule));

export type App = typeof app;
