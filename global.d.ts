import type { User } from "better-auth";
import type { db } from "./src/database/drizzle/db";
import type { LlmService } from "./src/server/services/llm.service";
import type { ScraperService } from "./src/server/services/scraper.service";
import type { UsernameGeneratorService } from "./src/server/services/username-generator.service";

export type AppUser = User & {
    role: string;
    totalPoints: number;
    currentStreak: number;
    longestStreak: number;
};

declare global {
    namespace Vike {
        interface PageContextServer {
            db: db;
            llm: LlmService;
            scraper: ScraperService;
            usernameGenerator: UsernameGeneratorService;
        }
        interface PageContext {
            user?: AppUser | null;
        }
    }
    namespace Universal {
        interface Context {
            db: db;
            llm: LlmService;
            scraper: ScraperService;
            usernameGenerator: UsernameGeneratorService;
            user?: AppUser | null;
        }
    }
}

declare module "telefunc" {
    namespace Telefunc {
        interface Context {
            db: db;
            llm: LlmService;
            scraper: ScraperService;
            usernameGenerator: UsernameGeneratorService;
            user?: AppUser | null;
        }
    }
}

// biome-ignore lint/complexity/noUselessEmptyExport: ensure that the file is considered as a module
export {};
