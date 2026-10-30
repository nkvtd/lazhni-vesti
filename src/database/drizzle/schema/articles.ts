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

export type HeadlineBlankItem = {
    index: number;
    answer: string;
    hint: string;
};

export type AiHeadlineProposal = {
    templateTitle: string;
    blanks: HeadlineBlankItem[];
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
    status: stagedStatusEnum("status").default("pending").notNull(),
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
