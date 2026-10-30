import {
    enhance,
    type RuntimeAdapter,
    type UniversalHandler,
    type UniversalMiddleware,
} from "@universal-middleware/core";
import { betterAuth } from "better-auth";
import { getAuthConfig } from "./better-auth";

let authSingleton: ReturnType<typeof betterAuth> | undefined;

function getAuth(runtime: RuntimeAdapter) {
    authSingleton ??= betterAuth(getAuthConfig(runtime));
    return authSingleton;
}

export const betterAuthSessionMiddleware: UniversalMiddleware = enhance(
    async (request, context, runtime) => {
        try {
            const data = await getAuth(runtime).api.getSession({
                headers: request.headers,
            });
            return {
                ...context,
                user: data?.user ?? null,
            };
        } catch (error) {
            console.debug("[auth]:", error);
            return {
                ...context,
                user: null,
            };
        }
    },
    {
        name: "lv:better-auth-middleware",
        immutable: false,
    },
);

export const betterAuthHandler = enhance(
    async (request, _context, runtime) => {
        return getAuth(runtime).handler(request);
    },
    {
        name: "lv:better-auth-handler",
        path: "/api/auth/**",
        method: ["GET", "POST"],
        immutable: false,
    },
) satisfies UniversalHandler;
