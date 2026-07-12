import { app } from "@/app";
import { env } from "@/config/env";
import { FeedbackService } from "./modules/feedback/feedback.service";
import { initAdapter } from "./modules/prayers/adapters/registry";
import { StatsService } from "./modules/stats/stats.service";

StatsService.init();
FeedbackService.init();
await initAdapter();

app.listen(env.PORT);

console.log(
	`Server is running at http://${app.server?.hostname}:${app.server?.port}`,
);

const gracefulShutdown = async () => {
	await FeedbackService.shutdown();
	process.exit(0);
};
process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);
