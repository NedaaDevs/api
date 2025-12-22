import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { openapi } from "@elysiajs/openapi";



export const app = new Elysia()
    .use(cors())
    .use(openapi({
        documentation: {
            info: {
                title: "Nedaa API",
                version: "1.0.0"
            }
        }
    }))
  

export type App = typeof app;