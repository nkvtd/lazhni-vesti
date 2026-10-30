import { dbPostgres } from "../../database/drizzle/db";
import { env } from "../env";
import { LlmService } from "./llm.service";
import { ScraperService } from "./scraper.service";
import { UsernameGeneratorService } from "./username-generator.service";

export type Services = {
    db: ReturnType<typeof dbPostgres>;
    llm: LlmService;
    scraper: ScraperService;
    usernameGenerator: UsernameGeneratorService;
};

const globalForServices = globalThis as unknown as {
    services?: Services;
    scraperScheduled?: boolean;
};

export function createServices(): Services {
    const db = dbPostgres();
    return {
        db,
        llm: new LlmService(env.OPENAI_API_KEY ?? ""),
        usernameGenerator: new UsernameGeneratorService(),
        scraper: new ScraperService(db).addFeed({
            name: "Time.mk",
            url: "https://time.mk/rss/hronika",
            type: "rss",
        }),
    };
}

export function getServices(): Services {
    globalForServices.services ??= createServices();

    if (!globalForServices.scraperScheduled) {
        globalForServices.scraperScheduled = true;
        const { scraper } = globalForServices.services;

        const tick = () =>
            scraper
                .run()
                .catch((err) =>
                    console.error("[scraper] scheduled scraping failed:", err),
                );

        void tick();
        setInterval(tick, 6 * 60 * 60 * 1000).unref();
    }

    return globalForServices.services;
}
