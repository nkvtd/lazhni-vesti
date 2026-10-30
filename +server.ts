import "./src/server/load";
import type { Server } from "vike/types";
import { app } from "./src/server/hono";
import { getServices } from "./src/server/services";

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

export default {
    fetch: app.fetch,

    prod: {
        port,
        // biome-ignore lint/correctness/noUnusedFunctionParameters: <Has to be so that the services get eagerly intialized in production>
        onCreate(server) {
            getServices();
        },
    },
} satisfies Server;
