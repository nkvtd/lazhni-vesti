import type { db } from "../../database/drizzle/db";
import { stagedArticles } from "../../database/drizzle/schema/articles";

export type FeedConfig = {
    name: string;
    url: string;
    type: "rss" | "json";
    jsonMap?: (data: unknown) => Array<{ title: string; url: string }>;
};

const KEYWORDS = [
    "украде",
    "уапсен",
    "приведен",
    "мечка",
    "пијан",
    "мортус",
    "тепачка",
    "чудо",
    "избегал",
    "лисици",
    "шок",
    "казна",
];

export class ScraperService {
    private isRunning = false;

    constructor(
        private readonly db: db,
        private readonly feeds: FeedConfig[] = [],
        private readonly keywords = KEYWORDS,
    ) {}

    addFeed(feed: FeedConfig) {
        this.feeds.push(feed);
        return this;
    }

    async run() {
        if (this.isRunning) return { inserted: 0 };
        this.isRunning = true;

        try {
            const matched: Array<{
                sourceName: string;
                originalTitle: string;
                sourceUrl: string;
                matchedKeywords: string[];
            }> = [];

            for (const feed of this.feeds) {
                try {
                    const raw = await this.fetchFeed(feed.url);
                    const items = this.parse(raw, feed);

                    for (const item of items) {
                        const lower = item.title.toLowerCase();
                        const hits = this.keywords.filter((kw) =>
                            lower.includes(kw),
                        );

                        if (hits.length > 0) {
                            matched.push({
                                sourceName: feed.name,
                                originalTitle: item.title,
                                sourceUrl: item.url,
                                matchedKeywords: hits,
                            });
                        }
                    }
                } catch (err) {
                    console.error(
                        `[scraper] scraping ${feed.name} failed:`,
                        err,
                    );
                }
            }

            if (matched.length === 0) return { inserted: 0 };

            const inserted = await this.db
                .insert(stagedArticles)
                .values(matched)
                .onConflictDoNothing({ target: stagedArticles.sourceUrl })
                .returning({ id: stagedArticles.id });

            return { inserted: inserted.length };
        } finally {
            this.isRunning = false;
        }
    }

    private async fetchFeed(url: string): Promise<string> {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
    }

    private parse(
        raw: string,
        feed: FeedConfig,
    ): Array<{ title: string; url: string }> {
        if (feed.type === "json" && feed.jsonMap) {
            return feed.jsonMap(JSON.parse(raw));
        }

        const blocks = raw.match(/<(item|entry)[\s>][\s\S]*?<\/\1>/gi) ?? [];
        return blocks.flatMap((block) => {
            const title = block.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
            const link =
                block.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1] ??
                block.match(/<link[^>]+href=["']([^"']+)["']/i)?.[1];

            if (!title || !link) return [];
            return [{ title: this.cleanXml(title), url: this.cleanXml(link) }];
        });
    }

    private cleanXml(str: string): string {
        return str
            .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, "$1")
            .replace(/&quot;/g, '"')
            .replace(/&#039;|&apos;/g, "'")
            .replace(/&amp;/g, "&")
            .trim();
    }
}
