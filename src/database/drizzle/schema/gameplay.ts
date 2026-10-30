import {
    boolean,
    integer,
    jsonb,
    pgTable,
    serial,
    text,
    timestamp,
    uniqueIndex,
} from "drizzle-orm/pg-core";
import { dailyChallenges } from "./articles";
import { user } from "./auth";

export type BlankProgressState = {
    solved: boolean;
    hintUsed: boolean;
    wrongAttempts: number;
    revealedAnswer?: string;
    revealedHint?: string;
};

export const gameSessions = pgTable(
    "game_sessions",
    {
        id: serial("id").primaryKey(),
        userId: text("user_id")
            .notNull()
            .references(() => user.id, { onDelete: "cascade" }),
        challengeId: integer("challenge_id")
            .notNull()
            .references(() => dailyChallenges.id, { onDelete: "cascade" }),
        isFreePlay: boolean("is_free_play").default(false).notNull(),
        score: integer("score").default(1000).notNull(),
        wrongGuessesCount: integer("wrong_guesses_count").default(0).notNull(),
        hintsUsedCount: integer("hints_used_count").default(0).notNull(),
        progress: jsonb("progress")
            .$type<Record<number, BlankProgressState>>()
            .default({})
            .notNull(),
        completed: boolean("completed").default(false).notNull(),
        completedAt: timestamp("completed_at", { withTimezone: true }),
    },
    (table) => [
        uniqueIndex("user_challenge_unique_idx").on(
            table.userId,
            table.challengeId,
        ),
    ],
);

export type GameSessionItem = typeof gameSessions.$inferSelect;
export type GameSessionInsert = typeof gameSessions.$inferInsert;
