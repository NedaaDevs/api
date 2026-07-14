import { app } from "@/app";
import { env } from "@/config/env";
import { FeedbackService } from "./modules/feedback/feedback.service";
import { initAdapter } from "./modules/prayers/adapters/registry";
import { StatsService } from "./modules/stats/stats.service";
import { startStatsSnapshot } from "./modules/stats/stats.snapshot";

StatsService.init();
const stopStatsSnapshot = startStatsSnapshot();
FeedbackService.init();
await initAdapter();

app.listen(env.PORT);

console.log(
	`Server is running at http://${app.server?.hostname}:${app.server?.port}`,
);

const gracefulShutdown = async () => {
	stopStatsSnapshot();
	StatsService.shutdown();
	await FeedbackService.shutdown();
	process.exit(0);
};
process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);
