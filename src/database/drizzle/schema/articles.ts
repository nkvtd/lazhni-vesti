import {
    date,
    integer,
    jsonb,
    pgEnum,
    pgTable,
    serial,
    text,
    timestamp,
} from "drizzle-orm/pg-core";

export const stagedStatusEnum = pgEnum("staged_status", [
    "pending",
    "approved",
    "rejected",
]);

export type RealityCheckData = {
    summaries: [string, string, string];
    correctIndex: number; // 0..2 — the FACTUAL summary
};

export type HeadlineBlankItem = {
    index: number;
    answer: string;
    hint: string;
    decoys?: string[]; // exactly 3, single words, for the "4 опции" lifeline
};

export type AiHeadlineProposal = {
    templateTitle: string;
    blanks: HeadlineBlankItem[];
    eventContext?: string; // spoiler-free context for "Што се случи?"
    techniqueId?: string; // one of MEDIA_TECHNIQUES ids
    realityCheck?: RealityCheckData;
};

export const stagedArticles = pgTable("staged_articles", {
    id: serial("id").primaryKey(),
    sourceName: text("source_name").notNull(),
    originalTitle: text("original_title").notNull(),
    sourceUrl: text("source_url").notNull().unique(),
    matchedKeywords: jsonb("matched_keywords")
        .$type<string[]>()
        .default([])
        .notNull(),
    aiSuggestion: jsonb("ai_suggestion")
        .$type<AiHeadlineProposal | null>()
        .default(null),
    articleExcerpt: text("article_excerpt"),
    status: stagedStatusEnum("status").default("pending").notNull(),
    playDate: date("play_date"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    scrapedAt: timestamp("scraped_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
});

export const dailyChallenges = pgTable("daily_challenges", {
    id: serial("id").primaryKey(),
    playDate: date("play_date").notNull().unique(),
    originalTitle: text("original_title").notNull(),
    templateTitle: text("template_title").notNull(),
    sourceName: text("source_name").notNull(),
    sourceUrl: text("source_url").notNull(),
    blanks: jsonb("blanks").$type<HeadlineBlankItem[]>().notNull(),
    eventContext: text("event_context"),
    techniqueId: text("technique_id"),
    realityCheck: jsonb("reality_check")
        .$type<RealityCheckData | null>()
        .default(null),
    stagedArticleId: integer("staged_article_id").references(
        () => stagedArticles.id,
        {
            onDelete: "set null",
        },
    ),
    createdAt: timestamp("created_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
});

export type StagedArticleItem = typeof stagedArticles.$inferSelect;
export type StagedArticleInsert = typeof stagedArticles.$inferInsert;
export type DailyChallengeItem = typeof dailyChallenges.$inferSelect;
export type DailyChallengeInsert = typeof dailyChallenges.$inferInsert;
