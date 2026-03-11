import { app } from "@/app";
import { env } from "@/config/env";
import { initAdapter } from "./modules/prayers/adapters/registry";
import { StatsService } from "./modules/stats/stats.service";

StatsService.init();
await initAdapter();

app.listen(env.PORT);

console.log(
	`Server is running at http://${app.server?.hostname}:${app.server?.port}`,
);
