import { app } from "@/app";
import { env } from "@/config/env";

import { initAdapter } from "./modules/prayers/adapters/registry";

initAdapter();

app.listen(env.PORT);

console.log(
	`Server is running at http://${app.server?.hostname}:${app.server?.port}`,
);
