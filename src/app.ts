import { cors } from "@elysiajs/cors";
import { openapi } from "@elysiajs/openapi";
import { Elysia } from "elysia";

// Modules
import { healthModule } from "@/modules/health";
import { locationsModule } from "@/modules/locations";
import { prayerModule } from "@/modules/prayers";

// Plugins
import { errorHandler } from "@/shared/plugins/error-handler";
import { logger } from "@/shared/plugins/logger";
import { globalRateLimit } from "@/shared/plugins/rate-limiter";

export const app = new Elysia()
	.use(cors())
	.use(logger)
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
	.use(globalRateLimit)
	.group("/v3", (app) =>
		app.use(healthModule).use(prayerModule).use(locationsModule),
	);

export type App = typeof app;
