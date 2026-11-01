import { and, desc, eq, lt } from "drizzle-orm";
import type { db as Db } from "../db";
import { dailyChallenges, gameSessions } from "../schema";
import { evaluateTimeMachineEligibility } from "./gamification";
import { getSkopjeDateString } from "./util";

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
    }

    const isFreePlay = isPastDate && !canUseTimeMachine;
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
        sourceUrl: completed ? challenge.sourceUrl : undefined,
        originalTitle: completed ? challenge.originalTitle : undefined,
        isFreePlay,
        canUseTimeMachine,
        timeMachineReason,
        score: session?.score ?? 1000,
        wrongGuessesCount: session?.wrongGuessesCount ?? 0,
        hintsUsedCount: session?.hintsUsedCount ?? 0,
        completed,
        won,
        blanks: challenge.blanks.map((b) => {
            const state = session?.progress?.[b.index];
            const solved = state?.solved ?? false;
            const hintUsed = state?.hintUsed ?? false;

            return {
                index: b.index,
                solved,
                hintUsed,
                wrongAttempts: state?.wrongAttempts ?? 0,
                revealedAnswer: solved || completed ? b.answer : undefined,
                revealedHint: hintUsed || completed ? b.hint : undefined,
            };
        }),
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
        .where(lt(dailyChallenges.playDate, today))
        .orderBy(desc(dailyChallenges.playDate))
        .limit(limit);

    const sessions = userId
        ? await db
              .select()
              .from(gameSessions)
              .where(eq(gameSessions.userId, userId))
        : [];

    const sessionByChallenge = new Map(sessions.map((s) => [s.challengeId, s]));

    const results = [];
    for (const c of challenges) {
        const s = sessionByChallenge.get(c.id);
        let canUseTimeMachine = false;
        if (userId && !s) {
            const tm = await evaluateTimeMachineEligibility(
                db,
                userId,
                c.playDate,
            );
            canUseTimeMachine = tm.eligible;
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
        });
    }

    return results;
}
