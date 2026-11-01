import { and, asc, desc, eq } from "drizzle-orm";
import type { db as Db } from "../db";
import { dailyChallenges, gameSessions, user } from "../schema";
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

    return { today, daily, allTime };
}
