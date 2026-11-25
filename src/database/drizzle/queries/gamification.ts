import { and, count, eq, gt, gte } from "drizzle-orm";
import type { DbOrTx } from "../db";
import {
    badges,
    dailyChallenges,
    gameSessions,
    timeMachineLogs,
    user,
    usersToBadges,
} from "../schema";
import { getSkopjeDateString, getStartOfMonth } from "./util";

export const TIME_MACHINE_COST = 1500;
export const TIME_MACHINE_MONTHLY_LIMIT = 2;
export const MONTHLY_BADGE_THRESHOLD = 15;

const STREAK_BADGES = [
    {
        threshold: 7,
        name: "7 дена по ред",
        description: "7 дена последователно погодени наслови.",
        icon: "fire",
    },
    {
        threshold: 30,
        name: "30 дена по ред",
        description: "Цел месец без пропуштен ден!",
        icon: "trophy",
    },
    {
        threshold: 100,
        name: "100 дена по ред",
        description: "Легенда на македонските портали.",
        icon: "crown",
    },
];

function getPreviousDateStr(dateStr: string): string {
    const d = new Date(`${dateStr}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().slice(0, 10);
}

async function ensureBadgesExist(db: DbOrTx) {
    const existing = await db.select().from(badges);
    if (existing.length > 0) return existing;

    await db
        .insert(badges)
        .values(
            STREAK_BADGES.map(({ name, description, icon }) => ({
                name,
                description,
                icon,
            })),
        )
        .onConflictDoNothing({ target: badges.name });
    return db.select().from(badges);
}

export async function getUserWonDates(
    db: DbOrTx,
    userId: string,
): Promise<Set<string>> {
    const rows = await db
        .select({ playDate: dailyChallenges.playDate })
        .from(gameSessions)
        .innerJoin(
            dailyChallenges,
            eq(gameSessions.challengeId, dailyChallenges.id),
        )
        .where(
            and(
                eq(gameSessions.userId, userId),
                eq(gameSessions.completed, true),
                eq(gameSessions.isFreePlay, false),
                gt(gameSessions.score, 0),
            ),
        );

    const tmRows = await db
        .select({ targetDate: timeMachineLogs.targetDate })
        .from(timeMachineLogs)
        .where(eq(timeMachineLogs.userId, userId));

    return new Set([
        ...rows.map((r) => r.playDate),
        ...tmRows.map((r) => r.targetDate),
    ]);
}

export async function getMonthlyTimeMachineUsage(
    db: DbOrTx,
    userId: string,
): Promise<number> {
    const startOfMonth = getStartOfMonth();
    const [tmUsage] = await db
        .select({ count: count() })
        .from(timeMachineLogs)
        .where(
            and(
                eq(timeMachineLogs.userId, userId),
                gte(timeMachineLogs.usedAt, startOfMonth),
            ),
        );
    return Number(tmUsage?.count ?? 0);
}

export function computeActiveStreakFromDates(
    wonDates: Set<string>,
    today = getSkopjeDateString(),
): number {
    if (wonDates.size === 0) return 0;
    const yesterday = getPreviousDateStr(today);

    let cursor = wonDates.has(today)
        ? today
        : wonDates.has(yesterday)
          ? yesterday
          : null;

    if (!cursor) return 0;

    let streak = 0;
    while (cursor && wonDates.has(cursor)) {
        streak += 1;
        cursor = getPreviousDateStr(cursor);
    }
    return streak;
}

export function checkTimeMachineEligibilityPure({
    totalPoints,
    usedThisMonth,
    wonDates,
    today,
    playDate,
}: {
    totalPoints: number;
    usedThisMonth: number;
    wonDates: Set<string>;
    today: string;
    playDate: string;
}) {
    if (playDate >= today) {
        return { eligible: false, reason: "Не е архивски предизвик." };
    }

    if (usedThisMonth >= TIME_MACHINE_MONTHLY_LIMIT) {
        return {
            eligible: false,
            reason: "Го искористивте месечниот лимит за Time Machine (2/2).",
        };
    }

    if (totalPoints < TIME_MACHINE_COST) {
        return {
            eligible: false,
            reason: `Потребни се ${TIME_MACHINE_COST} поени за Time Machine.`,
        };
    }

    if (wonDates.has(playDate)) {
        return { eligible: false, reason: "Веќе го имате освоено овој ден." };
    }

    const streakBefore = computeActiveStreakFromDates(wonDates, today);
    const simulatedDates = new Set(wonDates);
    simulatedDates.add(playDate);
    const streakAfter = computeActiveStreakFromDates(simulatedDates, today);

    const isCurrentMonth = playDate.slice(0, 7) === today.slice(0, 7);
    const helpsStreakOrBadge = streakAfter > streakBefore || isCurrentMonth;

    if (!helpsStreakOrBadge) {
        return {
            eligible: false,
            reason: "Овој датум не поправа активен streak ниту тековен месечен беџ.",
        };
    }

    return {
        eligible: true,
        cost: TIME_MACHINE_COST,
        remainingUses: TIME_MACHINE_MONTHLY_LIMIT - usedThisMonth,
    };
}

export async function evaluateTimeMachineEligibility(
    db: DbOrTx,
    userId: string,
    playDate: string,
) {
    const [u] = await db.select().from(user).where(eq(user.id, userId));
    if (!u) return { eligible: false, reason: "Корисникот не постои." };

    const today = getSkopjeDateString();
    const usedThisMonth = await getMonthlyTimeMachineUsage(db, userId);
    const wonDates = await getUserWonDates(db, userId);

    return checkTimeMachineEligibilityPure({
        totalPoints: u.totalPoints,
        usedThisMonth,
        wonDates,
        today,
        playDate,
    });
}

export async function awardDailyStreakAndPoints(
    db: DbOrTx,
    userId: string,
    playDate: string,
    earnedScore: number,
    usedTimeMachine = false,
) {
    const [u] = await db.select().from(user).where(eq(user.id, userId));
    if (!u) return;

    if (usedTimeMachine) {
        await db.insert(timeMachineLogs).values({
            userId,
            targetDate: playDate,
            pointsSpent: TIME_MACHINE_COST,
        });
    }

    const wonDates = await getUserWonDates(db, userId);
    wonDates.add(playDate);

    const currentStreak = computeActiveStreakFromDates(wonDates);
    const longestStreak = Math.max(u.longestStreak, currentStreak);
    const netPointsDelta = usedTimeMachine
        ? earnedScore - TIME_MACHINE_COST
        : earnedScore;
    const newLastPlayed =
        !u.lastPlayedDate || playDate > u.lastPlayedDate
            ? playDate
            : u.lastPlayedDate;

    await db
        .update(user)
        .set({
            totalPoints: Math.max(0, u.totalPoints + netPointsDelta),
            currentStreak,
            longestStreak,
            lastPlayedDate: newLastPlayed,
            updatedAt: new Date(),
        })
        .where(eq(user.id, userId));

    const allBadges = await ensureBadgesExist(db);
    for (const def of STREAK_BADGES) {
        if (currentStreak >= def.threshold) {
            const matchedBadge = allBadges.find((b) => b.name === def.name);
            if (matchedBadge) {
                await db
                    .insert(usersToBadges)
                    .values({ userId, badgeId: matchedBadge.id })
                    .onConflictDoNothing();
            }
        }
    }

    const yearMonth = playDate.slice(0, 7);
    const winsInMonth = Array.from(wonDates).filter((d) =>
        d.startsWith(yearMonth),
    ).length;

    if (winsInMonth >= MONTHLY_BADGE_THRESHOLD) {
        const monthlyBadgeName = `Месечен Шампион (${yearMonth})`;
        await db
            .insert(badges)
            .values({
                name: monthlyBadgeName,
                description: `Успешно решени ${MONTHLY_BADGE_THRESHOLD}+ наслови во ${yearMonth}.`,
                icon: "calendar",
            })
            .onConflictDoNothing({ target: badges.name });
        const [monthlyBadge] = await db
            .select()
            .from(badges)
            .where(eq(badges.name, monthlyBadgeName));

        await db
            .insert(usersToBadges)
            .values({ userId, badgeId: monthlyBadge.id })
            .onConflictDoNothing();
    }
}

export async function getUserAccountData(db: DbOrTx, userId: string) {
    await ensureBadgesExist(db);

    const userWithBadges = await db.query.user.findFirst({
        where: eq(user.id, userId),
        with: {
            usersToBadges: {
                with: {
                    badge: true,
                },
            },
        },
    });

    const usedThisMonth = await getMonthlyTimeMachineUsage(db, userId);

    return {
        earnedBadges:
            userWithBadges?.usersToBadges.map((ub) => ({
                ...ub.badge,
                awardedAt: ub.awardedAt,
            })) ?? [],
        timeMachine: {
            cost: TIME_MACHINE_COST,
            usedThisMonth,
            remainingUses: Math.max(
                0,
                TIME_MACHINE_MONTHLY_LIMIT - usedThisMonth,
            ),
        },
    };
}
