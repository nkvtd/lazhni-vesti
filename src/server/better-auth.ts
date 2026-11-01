import type { RuntimeAdapter } from "@universal-middleware/core";
import type { BetterAuthOptions } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import * as authSchema from "../database/drizzle/schema/auth";
import { env } from "./env";
import { getServices } from "./services";

function getDatabase(_runtime?: RuntimeAdapter): BetterAuthOptions["database"] {
    return drizzleAdapter(getServices().db, {
        provider: "pg",
        schema: authSchema,
    });
}

export function getAuthConfig(runtime?: RuntimeAdapter): BetterAuthOptions {
    return {
        secret: env.BETTER_AUTH_SECRET,
        database: getDatabase(runtime),
        emailAndPassword: {
            enabled: true,
        },
        socialProviders:
            env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET
                ? {
                      github: {
                          clientId: env.GITHUB_CLIENT_ID,
                          clientSecret: env.GITHUB_CLIENT_SECRET,
                      },
                  }
                : {},
        user: {
            additionalFields: {
                role: { type: "string", defaultValue: "player", input: false },
                totalPoints: { type: "number", defaultValue: 0, input: false },
                currentStreak: {
                    type: "number",
                    defaultValue: 0,
                    input: false,
                },
                longestStreak: {
                    type: "number",
                    defaultValue: 0,
                    input: false,
                },
            },
        },
        databaseHooks: {
            user: {
                create: {
                    before: async (user) => {
                        const { usernameGenerator } = getServices();
                        const generatedName =
                            !user.name || user.name.includes("@")
                                ? usernameGenerator.generate()
                                : user.name;
                        return { data: { ...user, name: generatedName } };
                    },
                },
            },
        },
    };
}
