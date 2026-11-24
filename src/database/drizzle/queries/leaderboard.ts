import { and, asc, desc, eq, inArray } from "drizzle-orm";
import type { db as Db } from "../db";
import {
    badges,
    dailyChallenges,
    gameSessions,
    user,
    usersToBadges,
} from "../schema";
import { getSkopjeDateString } from "./util";

export async function getLeaderboardsData(db: Db) {
    const today = getSkopjeDateString();
    const [todayChallenge] = await db
        .select()
        .from(dailyChallenges)
        .where(eq(dailyChallenges.playDate, today));

    const daily = todayChallenge
        ? await db
              .select({
                  userId: user.id,
                  username: user.name,
                  score: gameSessions.score,
                  wrongGuessesCount: gameSessions.wrongGuessesCount,
                  hintsUsedCount: gameSessions.hintsUsedCount,
                  completedAt: gameSessions.completedAt,
              })
              .from(gameSessions)
              .innerJoin(user, eq(gameSessions.userId, user.id))
              .where(
                  and(
                      eq(gameSessions.challengeId, todayChallenge.id),
                      eq(gameSessions.completed, true),
                      eq(gameSessions.isFreePlay, false),
                  ),
              )
              .orderBy(desc(gameSessions.score), asc(gameSessions.completedAt))
              .limit(50)
        : [];

    const allTime = await db
        .select({
            userId: user.id,
            username: user.name,
            totalPoints: user.totalPoints,
            currentStreak: user.currentStreak,
            longestStreak: user.longestStreak,
        })
        .from(user)
        .orderBy(desc(user.totalPoints), desc(user.longestStreak))
        .limit(50);

    const userIds = [
        ...daily.map((d) => d.userId),
        ...allTime.map((a) => a.userId),
    ];

    const badgeRows =
        userIds.length > 0
            ? await db
                  .select({
                      userId: usersToBadges.userId,
                      name: badges.name,
                      icon: badges.icon,
                  })
                  .from(usersToBadges)
                  .innerJoin(badges, eq(usersToBadges.badgeId, badges.id))
                  .where(inArray(usersToBadges.userId, userIds))
            : [];

    const badgesByUser = new Map<
        string,
        Array<{ name: string; icon: string }>
    >();
    for (const row of badgeRows) {
        const list = badgesByUser.get(row.userId) ?? [];
        list.push({ name: row.name, icon: row.icon });
        badgesByUser.set(row.userId, list);
    }

    return {
        today,
        daily: daily.map((d) => ({
            ...d,
            badges: badgesByUser.get(d.userId) ?? [],
        })),
        allTime: allTime.map((a) => ({
            ...a,
            badges: badgesByUser.get(a.userId) ?? [],
        })),
    };
}
