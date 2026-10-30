import { relations } from "drizzle-orm";
import { badges, user, usersToBadges } from "./schema";

export const userRelations = relations(user, ({ many }) => ({
    usersToBadges: many(usersToBadges),
}));

export const badgesRelations = relations(badges, ({ many }) => ({
    usersToBadges: many(usersToBadges),
}));

export const usersToBadgesRelations = relations(usersToBadges, ({ one }) => ({
    user: one(user, {
        fields: [usersToBadges.userId],
        references: [user.id],
    }),
    badge: one(badges, {
        fields: [usersToBadges.badgeId],
        references: [badges.id],
    }),
}));
