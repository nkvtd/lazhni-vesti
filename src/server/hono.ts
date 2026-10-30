import vike from "@vikejs/hono";
import { Hono } from "hono";
import {
    betterAuthHandler,
    betterAuthSessionMiddleware,
} from "./better-auth-handler";
import { servicesMiddleware } from "./services-middleware";
import { telefuncHandler } from "./telefunc-handler";

function getApp() {
    const app = new Hono();

    vike(app, [
        servicesMiddleware,
        betterAuthSessionMiddleware,
        betterAuthHandler,
        telefuncHandler,
    ]);

    return app;
}

export const app = getApp();
