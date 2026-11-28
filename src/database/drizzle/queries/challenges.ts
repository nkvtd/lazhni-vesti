import { and, desc, eq, lte } from "drizzle-orm";
import type { Db } from "../db";
import {
    dailyChallenges,
    gameSessions,
    timeMachineLogs,
    user,
} from "../schema";
import {
    checkTimeMachineEligibilityPure,
    evaluateTimeMachineEligibility,
} from "./gamification";
import { getSkopjeDateString, getStartOfMonth } from "./util";

export async function getChallengeForClient(
    db: Db,
    playDate: string,
    userId?: string,
) {
    const [challenge] = await db
        .select()
        .from(dailyChallenges)
        .where(eq(dailyChallenges.playDate, playDate));

    if (!challenge) return null;

    const [session] = userId
        ? await db
              .select()
              .from(gameSessions)
              .where(
                  and(
                      eq(gameSessions.userId, userId),
                      eq(gameSessions.challengeId, challenge.id),
                  ),
              )
        : [null];

    const today = getSkopjeDateString();
    const completed = session?.completed ?? false;
    const isPastDate = playDate < today;

    let canUseTimeMachine = false;
    let timeMachineReason: string | undefined;

    if (isPastDate && userId && !session) {
        const tmCheck = await evaluateTimeMachineEligibility(
            db,
            userId,
            playDate,
        );
        canUseTimeMachine = tmCheck.eligible;
        timeMachineReason = tmCheck.reason;
    } else if (isPastDate && session && !completed) {
        canUseTimeMachine = !session.isFreePlay;
    }

    const isFreePlay =
        isPastDate && session
            ? session.isFreePlay
            : isPastDate && !canUseTimeMachine;
    const won =
        completed &&
        challenge.blanks.every(
            (b) => session?.progress?.[b.index]?.solved === true,
        ) &&
        (session?.score ?? 0) > 0;

    return {
        id: challenge.id,
        playDate: challenge.playDate,
        templateTitle: challenge.templateTitle,
        sourceName: challenge.sourceName,
        eventContext: challenge.eventContext ?? null,
        sourceUrl: completed ? challenge.sourceUrl : undefined,
        originalTitle: completed ? challenge.originalTitle : undefined,
        techniqueId: completed ? (challenge.techniqueId ?? null) : undefined,
        realityCheck: completed ? (challenge.realityCheck ?? null) : undefined,
        realityChoiceIndex: completed
            ? (session?.realityChoiceIndex ?? null)
            : null,
        realityCorrect: completed ? (session?.realityCorrect ?? null) : null,
        isFreePlay,
        canUseTimeMachine,
        timeMachineReason,
        score: session?.score ?? 1000,
        wrongGuessesCount: session?.wrongGuessesCount ?? 0,
        hintsUsedCount: session?.hintsUsedCount ?? 0,
        // Paid unlocks only — free auto-assists are reported separately so the
        // client can charge −80 per paid option without inflating the penalty.
        usedLifelinesOptions: session?.usedLifelines?.optionsUnlocked ?? [],
        usedLifelinesFreeAssists: session?.usedLifelines?.freeAssists ?? [],
        completed,
        won,
        blanks: challenge.blanks.map((b) => {
            const state = session?.progress?.[b.index];
            const solved = state?.solved ?? false;
            const hintUsed = state?.hintUsed ?? false;
            const revealed =
                session?.usedLifelines?.revealedLetters?.[b.index] ?? [];

            return {
                index: b.index,
                solved,
                hintUsed,
                wrongAttempts: state?.wrongAttempts ?? 0,
                revealedAnswer: solved || completed ? b.answer : undefined,
                revealedHint: hintUsed || completed ? b.hint : undefined,
                answerLength: b.answer.trim().length,
                hint: b.hint,
                hasDecoys: (b.decoys?.length ?? 0) > 0,
                revealedLetters: revealed
                    .filter(
                        (position) =>
                            Number.isInteger(position) &&
                            position >= 0 &&
                            position < b.answer.length,
                    )
                    .map((position) => ({
                        position,
                        char: b.answer[position],
                    })),
            };
        }),
    };
}

export async function getTodayCommunityStats(db: Db) {
    const today = getSkopjeDateString();
    const [challenge] = await db
        .select({ id: dailyChallenges.id })
        .from(dailyChallenges)
        .where(eq(dailyChallenges.playDate, today));

    if (!challenge) return null;

    const sessions = await db
        .select({
            score: gameSessions.score,
            completed: gameSessions.completed,
            isFreePlay: gameSessions.isFreePlay,
        })
        .from(gameSessions)
        .where(eq(gameSessions.challengeId, challenge.id));

    const completedSessions = sessions.filter(
        (s) => s.completed && !s.isFreePlay,
    );
    // слободните игри не се бројат во стапката
    const totalSessions = sessions.filter((s) => !s.isFreePlay).length;
    const solveRate =
        totalSessions > 0
            ? Math.round((completedSessions.length / totalSessions) * 100)
            : 0;
    const averageScore =
        completedSessions.length > 0
            ? Math.round(
                  completedSessions.reduce((sum, s) => sum + s.score, 0) /
                      completedSessions.length,
              )
            : 0;

    return {
        totalSessions,
        completedSessions: completedSessions.length,
        solveRate,
        averageScore,
    };
}

export async function getArchiveChallenges(
    db: Db,
    userId?: string,
    limit = 60,
) {
    const today = getSkopjeDateString();
    const challenges = await db
        .select()
        .from(dailyChallenges)
        .where(lte(dailyChallenges.playDate, today))
        .orderBy(desc(dailyChallenges.playDate))
        .limit(limit);

    const startOfMonth = getStartOfMonth();
    const [userRows, sessionRows, tmRows] = userId
        ? await Promise.all([
              db
                  .select({ totalPoints: user.totalPoints })
                  .from(user)
                  .where(eq(user.id, userId)),
              db
                  .select({
                      session: gameSessions,
                      playDate: dailyChallenges.playDate,
                  })
                  .from(gameSessions)
                  .innerJoin(
                      dailyChallenges,
                      eq(gameSessions.challengeId, dailyChallenges.id),
                  )
                  .where(eq(gameSessions.userId, userId)),
              db
                  .select({
                      targetDate: timeMachineLogs.targetDate,
                      usedAt: timeMachineLogs.usedAt,
                  })
                  .from(timeMachineLogs)
                  .where(eq(timeMachineLogs.userId, userId)),
          ])
        : [[], [], []];

    const userRow = userRows[0];
    const sessionByChallenge = new Map(
        sessionRows.map((r) => [r.session.challengeId, r.session]),
    );
    const tmDates = new Set(tmRows.map((r) => r.targetDate));
    const usedThisMonth = tmRows.filter((r) => r.usedAt >= startOfMonth).length;
    const wonDates = new Set<string>([
        ...sessionRows
            .filter(
                (r) =>
                    r.session.completed &&
                    !r.session.isFreePlay &&
                    r.session.score > 0,
            )
            .map((r) => r.playDate),
        ...tmDates,
    ]);

    const results = [];
    for (const c of challenges) {
        const s = sessionByChallenge.get(c.id);
        let canUseTimeMachine = false;
        if (userId && userRow && !s) {
            canUseTimeMachine = checkTimeMachineEligibilityPure({
                totalPoints: userRow.totalPoints,
                usedThisMonth,
                wonDates,
                today,
                playDate: c.playDate,
            }).eligible;
        }

        results.push({
            id: c.id,
            playDate: c.playDate,
            sourceName: c.sourceName,
            blanksCount: c.blanks.length,
            completed: s?.completed ?? false,
            score: s?.completed ? s.score : null,
            isFreePlay: s ? s.isFreePlay : !canUseTimeMachine,
            canUseTimeMachine,
            usedTimeMachine: tmDates.has(c.playDate),
        });
    }

    return results;
}
