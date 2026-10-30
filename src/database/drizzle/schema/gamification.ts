import {
    date,
    integer,
    pgTable,
    serial,
    text,
    timestamp,
    uniqueIndex,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

export const badges = pgTable("badges", {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    icon: text("icon").notNull(),
});

export const usersToBadges = pgTable(
    "user_badges",
    {
        id: serial("id").primaryKey(),
        userId: text("user_id")
            .notNull()
            .references(() => user.id, { onDelete: "cascade" }),
        badgeId: integer("badge_id")
            .notNull()
            .references(() => badges.id, { onDelete: "cascade" }),
        awardedAt: timestamp("awarded_at", { withTimezone: true })
            .defaultNow()
            .notNull(),
    },
    (table) => [
        uniqueIndex("user_badge_unique_idx").on(table.userId, table.badgeId),
    ],
);

export const timeMachineLogs = pgTable("time_machine_logs", {
    id: serial("id").primaryKey(),
    userId: text("user_id")
        .notNull()
        .references(() => user.id, { onDelete: "cascade" }),
    targetDate: date("target_date").notNull(),
    pointsSpent: integer("points_spent").notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }).defaultNow().notNull(),
});

export type BadgeItem = typeof badges.$inferSelect;
export type BadgeInsert = typeof badges.$inferInsert;
export type TimeMachineLogItem = typeof timeMachineLogs.$inferSelect;
export type TimeMachineLogInsert = typeof timeMachineLogs.$inferInsert;
