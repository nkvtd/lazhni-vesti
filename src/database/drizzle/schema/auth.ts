import {
    boolean,
    date,
    integer,
    pgTable,
    text as pgText,
    timestamp,
} from "drizzle-orm/pg-core";

// Better Auth's tables, owned by Drizzle so its migrations create them.
// Regenerate with `npx auth generate` if you customize the Better Auth config.
// Column names are snake_case to match Better Auth's Drizzle adapter defaults.

export const user = pgTable("user", {
    id: pgText("id").primaryKey(),
    name: pgText("name").notNull(),
    email: pgText("email").notNull().unique(),
    emailVerified: boolean("email_verified").notNull(),
    image: pgText("image"),
    role: pgText("role").default("player").notNull(),
    totalPoints: integer("total_points").default(0).notNull(),
    currentStreak: integer("current_streak").default(0).notNull(),
    longestStreak: integer("longest_streak").default(0).notNull(),
    lastPlayedDate: date("last_played_date"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

export const session = pgTable("session", {
    id: pgText("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: pgText("token").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
    ipAddress: pgText("ip_address"),
    userAgent: pgText("user_agent"),
    userId: pgText("user_id").notNull(),
});

export const account = pgTable("account", {
    id: pgText("id").primaryKey(),
    accountId: pgText("account_id").notNull(),
    providerId: pgText("provider_id").notNull(),
    userId: pgText("user_id").notNull(),
    accessToken: pgText("access_token"),
    refreshToken: pgText("refresh_token"),
    idToken: pgText("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: pgText("scope"),
    password: pgText("password"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

export const verification = pgTable("verification", {
    id: pgText("id").primaryKey(),
    identifier: pgText("identifier").notNull(),
    value: pgText("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});
