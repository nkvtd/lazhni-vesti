import { and, eq } from "drizzle-orm";
import type { db as Db } from "../db";
import {
    type BlankProgressState,
    dailyChallenges,
    gameSessions,
} from "../schema";
import {
    awardDailyStreakAndPoints,
    evaluateTimeMachineEligibility,
} from "./gamification";
import { getSkopjeDateString } from "./util";

export const MAX_SCORE = 1000;
export const WRONG_PENALTY = 50;
export const HINT_PENALTY = 250;

export function normalizeSingleWord(word: string): string {
    const trimmed = word.trim().toLowerCase();
    if (/\s/.test(trimmed)) return "";
    return trimmed.replace(/[^\p{L}\p{N}-]/gu, "");
}

export function calculateSessionScore(
    wrongGuessesCount: number,
    hintsUsedCount: number,
): number {
    return Math.max(
        0,
        MAX_SCORE -
            wrongGuessesCount * WRONG_PENALTY -
            hintsUsedCount * HINT_PENALTY,
    );
}

export async function handleGuessOrHint(
    db: Db,
    params: {
        userId?: string;
        challengeId: number;
        blankIndex: number;
        guess?: string;
        requestHint?: boolean;
        anonState?: {
            wrongGuessesCount: number;
            hintsUsedCount: number;
            solvedIndices: number[];
            hintedIndices?: number[];
        };
    },
) {
    const [challenge] = await db
        .select()
        .from(dailyChallenges)
        .where(eq(dailyChallenges.id, params.challengeId));

    const blank = challenge?.blanks.find((b) => b.index === params.blankIndex);
    if (!challenge || !blank) {
        return null;
    }

    const isHint = Boolean(params.requestHint);
    const normalizedGuess = normalizeSingleWord(params.guess ?? "");
    const normalizedAnswer = normalizeSingleWord(blank.answer);

    if (!isHint && !normalizedGuess) {
        return {
            error: "Внесете точно еден збор (без празни места).",
        };
    }

    const correct = !isHint && normalizedGuess === normalizedAnswer;

    if (!params.userId) {
        const solvedSet = new Set(params.anonState?.solvedIndices ?? []);
        const hintedSet = new Set(params.anonState?.hintedIndices ?? []);
        const alreadySolved = solvedSet.has(blank.index);
        const alreadyHinted = hintedSet.has(blank.index);

        const currentWrong = Math.max(
            0,
            params.anonState?.wrongGuessesCount ?? 0,
        );
        const currentHints = Math.max(0, params.anonState?.hintsUsedCount ?? 0);
        const currentScore = calculateSessionScore(currentWrong, currentHints);

        if (isHint && !alreadySolved && !alreadyHinted) {
            if (currentScore <= HINT_PENALTY) {
                return {
                    error: `Немате доволно поени за хинт (потребни се над ${HINT_PENALTY} поени).`,
                };
            }
            hintedSet.add(blank.index);
        }

        const wrongGuessesCount =
            currentWrong + (!alreadySolved && !isHint && !correct ? 1 : 0);
        const hintsUsedCount =
            currentHints + (!alreadySolved && !alreadyHinted && isHint ? 1 : 0);

        if (correct) solvedSet.add(blank.index);

        const score = calculateSessionScore(wrongGuessesCount, hintsUsedCount);
        const allSolved = challenge.blanks.every((b) => solvedSet.has(b.index));
        const completed = allSolved || score === 0;
        const won = allSolved && score > 0;

        return {
            correct,
            blankIndex: blank.index,
            revealedAnswer: correct || completed ? blank.answer : undefined,
            revealedHint:
                isHint || alreadyHinted || completed ? blank.hint : undefined,
            score,
            wrongGuessesCount,
            hintsUsedCount,
            completed,
            won,
            sourceUrl: completed ? challenge.sourceUrl : undefined,
            originalTitle: completed ? challenge.originalTitle : undefined,
            allAnswers: completed
                ? Object.fromEntries(
                      challenge.blanks.map((b) => [b.index, b.answer]),
                  )
                : undefined,
        };
    }

    const [existing] = await db
        .select()
        .from(gameSessions)
        .where(
            and(
                eq(gameSessions.userId, params.userId),
                eq(gameSessions.challengeId, challenge.id),
            ),
        );

    if (existing?.completed) {
        const allSolved = challenge.blanks.every(
            (b) => existing.progress[b.index]?.solved === true,
        );
        return {
            correct: Boolean(existing.progress[blank.index]?.solved),
            blankIndex: blank.index,
            revealedAnswer: blank.answer,
            revealedHint: blank.hint,
            score: existing.score,
            wrongGuessesCount: existing.wrongGuessesCount,
            hintsUsedCount: existing.hintsUsedCount,
            completed: true,
            won: allSolved && existing.score > 0,
            sourceUrl: challenge.sourceUrl,
            originalTitle: challenge.originalTitle,
            allAnswers: Object.fromEntries(
                challenge.blanks.map((b) => [b.index, b.answer]),
            ),
        };
    }

    const today = getSkopjeDateString();
    const isPastDate = challenge.playDate < today;

    let isFreePlay = false;
    let isTimeMachineSession = false;

    if (existing) {
        isFreePlay = existing.isFreePlay;
        isTimeMachineSession = isPastDate && !existing.isFreePlay;
    } else if (isPastDate) {
        const tmCheck = await evaluateTimeMachineEligibility(
            db,
            params.userId,
            challenge.playDate,
        );
        isTimeMachineSession = tmCheck.eligible;
        isFreePlay = !tmCheck.eligible;
    }

    const progress: Record<number, BlankProgressState> = {
        ...(existing?.progress ?? {}),
    };
    const slot: BlankProgressState = progress[blank.index] ?? {
        solved: false,
        hintUsed: false,
        wrongAttempts: 0,
    };

    let wrongGuessesCount = existing?.wrongGuessesCount ?? 0;
    let hintsUsedCount = existing?.hintsUsedCount ?? 0;
    const currentScore = calculateSessionScore(
        wrongGuessesCount,
        hintsUsedCount,
    );

    if (!slot.solved) {
        if (isHint && !slot.hintUsed) {
            if (currentScore <= HINT_PENALTY) {
                return {
                    error: `Немате доволно поени за хинт (потребни се над ${HINT_PENALTY} поени).`,
                };
            }
            slot.hintUsed = true;
            slot.revealedHint = blank.hint;
            hintsUsedCount += 1;
        } else if (!isHint) {
            if (correct) {
                slot.solved = true;
                slot.revealedAnswer = blank.answer;
            } else {
                slot.wrongAttempts += 1;
                wrongGuessesCount += 1;
            }
        }
    }

    progress[blank.index] = slot;

    const score = calculateSessionScore(wrongGuessesCount, hintsUsedCount);
    const allSolved = challenge.blanks.every(
        (b) => progress[b.index]?.solved === true,
    );
    const completed = allSolved || score === 0;
    const won = allSolved && score > 0;

    if (completed) {
        for (const b of challenge.blanks) {
            progress[b.index] = {
                ...(progress[b.index] ?? {
                    solved: false,
                    hintUsed: false,
                    wrongAttempts: 0,
                }),
                revealedAnswer: b.answer,
                revealedHint: b.hint,
            };
        }
    }

    if (completed && won && isTimeMachineSession) {
        const finalTmCheck = await evaluateTimeMachineEligibility(
            db,
            params.userId,
            challenge.playDate,
        );
        if (!finalTmCheck.eligible) {
            isTimeMachineSession = false;
            isFreePlay = true;
        }
    }

    await db
        .insert(gameSessions)
        .values({
            userId: params.userId,
            challengeId: challenge.id,
            isFreePlay,
            score,
            wrongGuessesCount,
            hintsUsedCount,
            progress,
            completed,
            completedAt: completed ? new Date() : null,
        })
        .onConflictDoUpdate({
            target: [gameSessions.userId, gameSessions.challengeId],
            set: {
                score,
                wrongGuessesCount,
                hintsUsedCount,
                progress,
                completed,
                completedAt: completed ? new Date() : existing?.completedAt,
            },
        });

    if (completed && won && !isFreePlay) {
        await awardDailyStreakAndPoints(
            db,
            params.userId,
            challenge.playDate,
            score,
            isTimeMachineSession,
        );
    }

    return {
        correct,
        blankIndex: blank.index,
        revealedAnswer: slot.solved || completed ? blank.answer : undefined,
        revealedHint: slot.hintUsed || completed ? blank.hint : undefined,
        score,
        wrongGuessesCount,
        hintsUsedCount,
        completed,
        won,
        sourceUrl: completed ? challenge.sourceUrl : undefined,
        originalTitle: completed ? challenge.originalTitle : undefined,
        allAnswers: completed
            ? Object.fromEntries(
                  challenge.blanks.map((b) => [b.index, b.answer]),
              )
            : undefined,
    };
}

export async function syncAnonSessionToDb(
    db: Db,
    userId: string,
    payload: {
        challengeId: number;
        wrongGuessesCount: number;
        hintsUsedCount: number;
        progress: Record<number, BlankProgressState>;
    },
) {
    const [challenge] = await db
        .select()
        .from(dailyChallenges)
        .where(eq(dailyChallenges.id, payload.challengeId));
    if (!challenge) return;

    const today = getSkopjeDateString();
    if (challenge.playDate !== today) return;

    const sanitizedProgress: Record<number, BlankProgressState> = {};
    for (const b of challenge.blanks) {
        const clientSlot = payload.progress[b.index];
        const isActuallySolved =
            Boolean(clientSlot?.solved) &&
            normalizeSingleWord(clientSlot?.revealedAnswer ?? "") ===
                normalizeSingleWord(b.answer);

        sanitizedProgress[b.index] = {
            solved: isActuallySolved,
            hintUsed: Boolean(clientSlot?.hintUsed),
            wrongAttempts: Math.max(0, Number(clientSlot?.wrongAttempts ?? 0)),
            revealedAnswer: isActuallySolved ? b.answer : undefined,
            revealedHint: clientSlot?.hintUsed ? b.hint : undefined,
        };
    }

    const minWrongFromSlots = Object.values(sanitizedProgress).reduce(
        (sum, s) => sum + s.wrongAttempts,
        0,
    );
    const minHintsFromSlots = Object.values(sanitizedProgress).filter(
        (s) => s.hintUsed,
    ).length;

    const finalWrong = Math.max(
        minWrongFromSlots,
        Math.max(0, payload.wrongGuessesCount ?? 0),
    );
    const finalHints = Math.max(
        minHintsFromSlots,
        Math.max(0, payload.hintsUsedCount ?? 0),
    );

    const score = calculateSessionScore(finalWrong, finalHints);
    const allSolved = challenge.blanks.every(
        (b) => sanitizedProgress[b.index]?.solved === true,
    );
    const completed = allSolved || score === 0;
    const won = allSolved && score > 0;

    if (completed) {
        for (const b of challenge.blanks) {
            sanitizedProgress[b.index] = {
                ...sanitizedProgress[b.index],
                revealedAnswer: b.answer,
                revealedHint: b.hint,
            };
        }
    }

    const inserted = await db
        .insert(gameSessions)
        .values({
            userId,
            challengeId: challenge.id,
            isFreePlay: false,
            score,
            wrongGuessesCount: finalWrong,
            hintsUsedCount: finalHints,
            progress: sanitizedProgress,
            completed,
            completedAt: completed ? new Date() : null,
        })
        .onConflictDoNothing()
        .returning({ id: gameSessions.id });

    if (inserted.length > 0 && completed && won) {
        await awardDailyStreakAndPoints(
            db,
            userId,
            challenge.playDate,
            score,
            false,
        );
    }
}
