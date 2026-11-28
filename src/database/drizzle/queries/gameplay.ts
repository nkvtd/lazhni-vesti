import { and, eq } from "drizzle-orm";
import type { Db, DbOrTx } from "../db";
import {
    type BlankProgressState,
    dailyChallenges,
    type GameSessionItem,
    gameSessions,
    type HeadlineBlankItem,
    type RealityCheckData,
    type UsedLifelines,
    user,
} from "../schema";
import {
    awardBadgeByName,
    awardDailyStreakAndPoints,
    evaluateTimeMachineEligibility,
    getUserWonDates,
} from "./gamification";
import { getSkopjeDateString, getStartOfWeekDateString } from "./util";

export const MAX_SCORE = 1000;
export const WRONG_PENALTY = 30;
export const LETTER_PENALTY = 40;
export const OPTIONS_PENALTY = 80;
export const HINT_PENALTY = 0;

export type LetterFeedbackStatus = "exact" | "misplaced" | "absent";
export type LetterFeedback = { char: string; status: LetterFeedbackStatus };

/** Client-side lifeline + game state for anonymous play. */
export type AnonLifelines = Partial<UsedLifelines> & {
    wrongGuessesCount?: number;
    hintsUsedCount?: number;
    solvedIndices?: number[];
};

export type ScoreTail = {
    score: number;
    wrongGuessesCount: number;
    hintsUsedCount: number;
    lettersRevealedCount: number;
    optionsUnlockedCount: number;
    completed: boolean;
    won: boolean;
    sourceUrl?: string;
    originalTitle?: string;
    allAnswers?: Record<number, string>;
    realityCheck?: RealityCheckData;
    techniqueId?: string | null;
};

export type RevealLetterResult = { position: number; char: string } & ScoreTail;
export type UnlockOptionsResult = { options: string[] } & ScoreTail;
export type RealityCheckResult = {
    correct: boolean;
    correctIndex: number;
    techniqueId: string | null;
    alreadyAnswered: boolean;
};

export function normalizeSingleWord(word: string): string {
    const trimmed = word.trim().toLowerCase();
    if (/\s/.test(trimmed)) return "";
    return trimmed.replace(/[^\p{L}\p{N}-]/gu, "");
}

export function calculateSessionScoreV2(
    wrongGuessesCount: number,
    lettersRevealedCount: number,
    optionsUnlockedCount: number,
): number {
    return Math.max(
        0,
        MAX_SCORE -
            wrongGuessesCount * WRONG_PENALTY -
            lettersRevealedCount * LETTER_PENALTY -
            optionsUnlockedCount * OPTIONS_PENALTY,
    );
}

export function evaluateLetterFeedback(
    guess: string,
    answer: string,
): LetterFeedback[] {
    const g = guess.trim().toLowerCase();
    const a = answer.trim().toLowerCase();
    const feedback: LetterFeedback[] = g
        .split("")
        .map((char) => ({ char, status: "absent" as const }));

    const unaccounted: Record<string, number> = {};
    for (let i = 0; i < a.length; i += 1) {
        if (g[i] === a[i]) {
            feedback[i].status = "exact";
        } else {
            unaccounted[a[i]] = (unaccounted[a[i]] ?? 0) + 1;
        }
    }

    for (let i = 0; i < g.length; i += 1) {
        if (feedback[i].status === "exact") continue;
        const char = g[i];
        if ((unaccounted[char] ?? 0) > 0) {
            feedback[i].status = "misplaced";
            unaccounted[char] -= 1;
        }
    }

    return feedback;
}

type ChallengeRow = typeof dailyChallenges.$inferSelect;

function toAnswerMap(blanks: HeadlineBlankItem[]): Record<number, string> {
    return Object.fromEntries(blanks.map((b) => [b.index, b.answer]));
}

function revealCompletedProgress(
    blanks: HeadlineBlankItem[],
    progress: Record<number, BlankProgressState>,
) {
    for (const b of blanks) {
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

function solvedFromProgress(
    progress: Record<number, BlankProgressState>,
): Set<number> {
    return new Set(
        Object.entries(progress)
            .filter(([, state]) => state?.solved === true)
            .map(([index]) => Number(index)),
    );
}

function normalizeLifelines(
    lifelines?: Partial<UsedLifelines> | null,
): UsedLifelines {
    return {
        revealedLetters: lifelines?.revealedLetters ?? {},
        optionsUnlocked: lifelines?.optionsUnlocked ?? [],
        freeAssists: lifelines?.freeAssists ?? [],
    };
}

function countLifelines(lifelines: UsedLifelines) {
    const letters = Object.values(lifelines.revealedLetters).reduce(
        (sum, positions) => sum + new Set(positions).size,
        0,
    );
    return { letters, options: lifelines.optionsUnlocked.length };
}

function hasAnyLifeline(lifelines: UsedLifelines): boolean {
    const counts = countLifelines(lifelines);
    return (
        counts.letters > 0 ||
        counts.options > 0 ||
        lifelines.freeAssists.length > 0
    );
}

function buildScoreTail(
    challenge: ChallengeRow,
    solved: Set<number>,
    wrongGuessesCount: number,
    hintsUsedCount: number,
    lifelines: UsedLifelines,
    score: number,
): ScoreTail {
    const counts = countLifelines(lifelines);
    const allSolved = challenge.blanks.every((b) => solved.has(b.index));
    const completed = allSolved || score === 0;
    const won = allSolved && score > 0;

    return {
        score,
        wrongGuessesCount,
        hintsUsedCount,
        lettersRevealedCount: counts.letters,
        optionsUnlockedCount: counts.options,
        completed,
        won,
        sourceUrl: completed ? challenge.sourceUrl : undefined,
        originalTitle: completed ? challenge.originalTitle : undefined,
        allAnswers: completed ? toAnswerMap(challenge.blanks) : undefined,
        realityCheck: completed
            ? (challenge.realityCheck ?? undefined)
            : undefined,
        techniqueId: completed ? (challenge.techniqueId ?? null) : null,
    };
}

/** First position of the answer that is not whitespace and not revealed yet. */
function firstUnrevealedPosition(answer: string, revealed: number[]): number {
    const revealedSet = new Set(revealed);
    for (let i = 0; i < answer.length; i += 1) {
        if (/\s/.test(answer[i])) continue;
        if (!revealedSet.has(i)) return i;
    }
    return -1;
}

/** Deterministic shuffle (seeded LCG) so anon replay / SSR keeps the same order. */
function seededShuffle<T>(items: T[], seed: number): T[] {
    const result = [...items];
    let state = seed >>> 0;
    for (let i = result.length - 1; i > 0; i -= 1) {
        state = (state * 1664525 + 1013904223) >>> 0;
        const j = state % (i + 1);
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

export async function handleGuessOrHint(
    db: Db,
    params: {
        userId?: string;
        challengeId: number;
        blankIndex: number;
        guess?: string;
        anonState?: AnonLifelines;
    },
) {
    const [challenge] = await db
        .select()
        .from(dailyChallenges)
        .where(eq(dailyChallenges.id, params.challengeId));

    const blank = challenge?.blanks.find((b) => b.index === params.blankIndex);
    if (!challenge || !blank || challenge.playDate > getSkopjeDateString()) {
        return null;
    }

    const normalizedGuess = normalizeSingleWord(params.guess ?? "");
    const normalizedAnswer = normalizeSingleWord(blank.answer);

    if (!normalizedGuess) {
        return {
            error: "Внесете точно еден збор (без празни места).",
        };
    }

    const correct = normalizedGuess === normalizedAnswer;

    if (!params.userId) {
        return handleAnonMove(challenge, blank, {
            correct,
            guess: normalizedGuess,
            anonState: params.anonState,
        });
    }

    return handleRegisteredMove(db, challenge, blank, {
        userId: params.userId,
        correct,
        guess: normalizedGuess,
    });
}

function handleAnonMove(
    challenge: ChallengeRow,
    blank: HeadlineBlankItem,
    move: {
        correct: boolean;
        guess: string;
        anonState?: AnonLifelines;
    },
) {
    const { correct, guess, anonState } = move;
    const solvedSet = new Set(anonState?.solvedIndices ?? []);
    const alreadySolved = solvedSet.has(blank.index);
    const lifelines = normalizeLifelines(anonState);

    const wrongGuessesCount =
        Math.max(0, anonState?.wrongGuessesCount ?? 0) +
        (!alreadySolved && !correct ? 1 : 0);
    const hintsUsedCount = Math.max(0, anonState?.hintsUsedCount ?? 0);

    if (correct) solvedSet.add(blank.index);

    const counts = countLifelines(lifelines);
    const score = calculateSessionScoreV2(
        wrongGuessesCount,
        counts.letters,
        counts.options,
    );
    const tail = buildScoreTail(
        challenge,
        solvedSet,
        wrongGuessesCount,
        hintsUsedCount,
        lifelines,
        score,
    );

    return {
        correct,
        blankIndex: blank.index,
        revealedAnswer: correct || tail.completed ? blank.answer : undefined,
        revealedHint: tail.completed ? blank.hint : undefined,
        letterFeedback:
            !alreadySolved && !correct
                ? evaluateLetterFeedback(
                      guess,
                      normalizeSingleWord(blank.answer),
                  )
                : undefined,
        ...tail,
    };
}

function handleRegisteredMove(
    db: Db,
    challenge: ChallengeRow,
    blank: HeadlineBlankItem,
    move: { userId: string; correct: boolean; guess: string },
) {
    const { userId, correct, guess } = move;
    return db.transaction(async (tx) => {
        await tx
            .select({ id: user.id })
            .from(user)
            .where(eq(user.id, userId))
            .for("update");

        const [existing] = await tx
            .select()
            .from(gameSessions)
            .where(
                and(
                    eq(gameSessions.userId, userId),
                    eq(gameSessions.challengeId, challenge.id),
                ),
            );

        const lifelines = normalizeLifelines(existing?.usedLifelines);
        const existingSolved = solvedFromProgress(existing?.progress ?? {});

        if (existing?.completed) {
            const counts = countLifelines(lifelines);
            const blankSolved = existingSolved.has(blank.index);
            return {
                correct: blankSolved,
                blankIndex: blank.index,
                revealedAnswer: blank.answer,
                revealedHint: blank.hint,
                letterFeedback:
                    !blankSolved && !correct
                        ? evaluateLetterFeedback(
                              guess,
                              normalizeSingleWord(blank.answer),
                          )
                        : undefined,
                score: existing.score,
                wrongGuessesCount: existing.wrongGuessesCount,
                hintsUsedCount: existing.hintsUsedCount,
                lettersRevealedCount: counts.letters,
                optionsUnlockedCount: counts.options,
                completed: true,
                won:
                    challenge.blanks.every((b) =>
                        existingSolved.has(b.index),
                    ) && existing.score > 0,
                sourceUrl: challenge.sourceUrl,
                originalTitle: challenge.originalTitle,
                allAnswers: toAnswerMap(challenge.blanks),
                realityCheck: challenge.realityCheck ?? undefined,
                techniqueId: challenge.techniqueId ?? null,
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
                tx,
                userId,
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
        const hintsUsedCount = existing?.hintsUsedCount ?? 0;
        let letterFeedback: LetterFeedback[] | undefined;

        if (!slot.solved) {
            if (correct) {
                slot.solved = true;
                slot.revealedAnswer = blank.answer;
            } else {
                slot.wrongAttempts += 1;
                wrongGuessesCount += 1;
                letterFeedback = evaluateLetterFeedback(
                    guess,
                    normalizeSingleWord(blank.answer),
                );
            }
        }

        progress[blank.index] = slot;

        const counts = countLifelines(lifelines);
        const score = calculateSessionScoreV2(
            wrongGuessesCount,
            counts.letters,
            counts.options,
        );
        const solved = solvedFromProgress(progress);
        const tail = buildScoreTail(
            challenge,
            solved,
            wrongGuessesCount,
            hintsUsedCount,
            lifelines,
            score,
        );

        if (tail.completed) {
            revealCompletedProgress(challenge.blanks, progress);
        }

        if (tail.completed && tail.won && isTimeMachineSession) {
            const finalTmCheck = await evaluateTimeMachineEligibility(
                tx,
                userId,
                challenge.playDate,
            );
            if (!finalTmCheck.eligible) {
                isTimeMachineSession = false;
                isFreePlay = true;
            }
        }

        await tx
            .insert(gameSessions)
            .values({
                userId,
                challengeId: challenge.id,
                isFreePlay,
                score,
                wrongGuessesCount,
                hintsUsedCount,
                progress,
                usedLifelines: existing?.usedLifelines ?? null,
                completed: tail.completed,
                completedAt: tail.completed ? new Date() : null,
            })
            .onConflictDoUpdate({
                target: [gameSessions.userId, gameSessions.challengeId],
                set: {
                    score,
                    wrongGuessesCount,
                    hintsUsedCount,
                    progress,
                    usedLifelines: existing?.usedLifelines ?? null,
                    completed: tail.completed,
                    completedAt: tail.completed
                        ? new Date()
                        : existing?.completedAt,
                    isFreePlay,
                },
            });

        if (tail.completed && tail.won && !isFreePlay) {
            await awardDailyStreakAndPoints(
                tx,
                userId,
                challenge.playDate,
                score,
                isTimeMachineSession,
            );
            if (!hasAnyLifeline(lifelines)) {
                await awardBadgeByName(tx, userId, "Без помош");
            }
            const weekStart = getStartOfWeekDateString();
            const wonDates = await getUserWonDates(tx, userId);
            const winsThisWeek = Array.from(wonDates).filter(
                (d) => d >= weekStart,
            ).length;
            if (winsThisWeek >= 5) {
                await awardBadgeByName(tx, userId, "Неделен херој");
            }
        }

        return {
            correct,
            blankIndex: blank.index,
            revealedAnswer:
                slot.solved || tail.completed ? blank.answer : undefined,
            revealedHint:
                slot.hintUsed || tail.completed ? blank.hint : undefined,
            letterFeedback,
            ...tail,
        };
    });
}

function computeRevealLetter(
    challenge: ChallengeRow,
    blank: HeadlineBlankItem,
    lifelines: UsedLifelines,
    solved: Set<number>,
    wrongGuessesCount: number,
    hintsUsedCount: number,
):
    | { error: string }
    | {
          position: number;
          char: string;
          nextLifelines: UsedLifelines;
          tail: ScoreTail;
      } {
    const alreadyRevealed = lifelines.revealedLetters[blank.index] ?? [];
    const position = solved.has(blank.index)
        ? -1
        : firstUnrevealedPosition(blank.answer, alreadyRevealed);

    if (position < 0) {
        return { error: "Сите букви од овој збор се откриени." };
    }

    const counts = countLifelines(lifelines);
    const currentScore = calculateSessionScoreV2(
        wrongGuessesCount,
        counts.letters,
        counts.options,
    );
    if (currentScore <= LETTER_PENALTY) {
        return {
            error: `Немате доволно поени за откривање буква (потребни се над ${LETTER_PENALTY} поени).`,
        };
    }

    const nextLifelines: UsedLifelines = {
        revealedLetters: {
            ...lifelines.revealedLetters,
            [blank.index]: [...alreadyRevealed, position].sort((a, b) => a - b),
        },
        optionsUnlocked: lifelines.optionsUnlocked,
        freeAssists: lifelines.freeAssists,
    };
    const nextCounts = countLifelines(nextLifelines);
    const score = calculateSessionScoreV2(
        wrongGuessesCount,
        nextCounts.letters,
        nextCounts.options,
    );

    return {
        position,
        char: blank.answer[position],
        nextLifelines,
        tail: buildScoreTail(
            challenge,
            solved,
            wrongGuessesCount,
            hintsUsedCount,
            nextLifelines,
            score,
        ),
    };
}

/** Deterministic option set for a blank, or null when there are not enough decoys. */
function buildOptions(
    challenge: ChallengeRow,
    blank: HeadlineBlankItem,
): string[] | null {
    const normalizedAnswer = normalizeSingleWord(blank.answer);
    const decoys = Array.from(
        new Set(
            (blank.decoys ?? [])
                .map(normalizeSingleWord)
                .filter((d) => d.length > 0 && d !== normalizedAnswer),
        ),
    );
    if (decoys.length < 3) return null;

    return seededShuffle(
        [blank.answer, ...decoys.slice(0, 3)],
        challenge.id * 1000 + blank.index,
    );
}

function computeUnlockOptions(
    challenge: ChallengeRow,
    blank: HeadlineBlankItem,
    lifelines: UsedLifelines,
    solved: Set<number>,
    wrongGuessesCount: number,
    hintsUsedCount: number,
    freeAssist: boolean,
):
    | { error: string }
    | {
          options: string[];
          nextLifelines: UsedLifelines;
          tail: ScoreTail;
      } {
    const options = buildOptions(challenge, blank);
    if (!options) {
        return { error: "Нема доволно валидни опции за овој збор." };
    }

    const counts = countLifelines(lifelines);
    const currentScore = calculateSessionScoreV2(
        wrongGuessesCount,
        counts.letters,
        counts.options,
    );

    // Idempotent re-fetch: already-unlocked options cost nothing (refresh-safe).
    if (
        lifelines.optionsUnlocked.includes(blank.index) ||
        lifelines.freeAssists.includes(blank.index)
    ) {
        return {
            options,
            nextLifelines: lifelines,
            tail: buildScoreTail(
                challenge,
                solved,
                wrongGuessesCount,
                hintsUsedCount,
                lifelines,
                currentScore,
            ),
        };
    }

    if (solved.has(blank.index)) {
        return { error: "Опциите за овој збор веќе се отклучени." };
    }

    if (!freeAssist && currentScore <= OPTIONS_PENALTY) {
        return {
            error: `Немате доволно поени за опции (потребни се над ${OPTIONS_PENALTY} поени).`,
        };
    }

    // Free auto-assist is persisted separately so it survives a refresh uncosted.
    const nextLifelines: UsedLifelines = freeAssist
        ? {
              revealedLetters: lifelines.revealedLetters,
              optionsUnlocked: lifelines.optionsUnlocked,
              freeAssists: [...lifelines.freeAssists, blank.index],
          }
        : {
              revealedLetters: lifelines.revealedLetters,
              optionsUnlocked: [...lifelines.optionsUnlocked, blank.index],
              freeAssists: lifelines.freeAssists,
          };
    const nextCounts = countLifelines(nextLifelines);
    const score = calculateSessionScoreV2(
        wrongGuessesCount,
        nextCounts.letters,
        nextCounts.options,
    );

    return {
        options,
        nextLifelines,
        tail: buildScoreTail(
            challenge,
            solved,
            wrongGuessesCount,
            hintsUsedCount,
            nextLifelines,
            score,
        ),
    };
}

async function persistLifelines(
    tx: DbOrTx,
    userId: string,
    challenge: ChallengeRow,
    existing: GameSessionItem | undefined,
    lifelines: UsedLifelines,
    tail: ScoreTail,
) {
    const completedAt = tail.completed
        ? new Date()
        : (existing?.completedAt ?? null);

    // A lifeline move on a past date must not mint a counted TM win for free.
    const isFreePlay = existing
        ? existing.isFreePlay
        : challenge.playDate < getSkopjeDateString()
          ? !(
                await evaluateTimeMachineEligibility(
                    tx,
                    userId,
                    challenge.playDate,
                )
            ).eligible
          : false;

    await tx
        .insert(gameSessions)
        .values({
            userId,
            challengeId: challenge.id,
            isFreePlay,
            score: tail.score,
            wrongGuessesCount: tail.wrongGuessesCount,
            hintsUsedCount: tail.hintsUsedCount,
            progress: existing?.progress ?? {},
            usedLifelines: lifelines,
            completed: tail.completed,
            completedAt,
        })
        .onConflictDoUpdate({
            target: [gameSessions.userId, gameSessions.challengeId],
            set: {
                usedLifelines: lifelines,
                score: tail.score,
                wrongGuessesCount: tail.wrongGuessesCount,
                hintsUsedCount: tail.hintsUsedCount,
                progress: existing?.progress ?? {},
                isFreePlay,
                completed: tail.completed,
                completedAt,
            },
        });
}

export async function revealLetter(
    db: Db,
    params: {
        userId?: string;
        challengeId: number;
        blankIndex: number;
        anonState?: AnonLifelines;
    },
) {
    const [challenge] = await db
        .select()
        .from(dailyChallenges)
        .where(eq(dailyChallenges.id, params.challengeId));

    const blank = challenge?.blanks.find((b) => b.index === params.blankIndex);
    if (!challenge || !blank || challenge.playDate > getSkopjeDateString()) {
        return null;
    }

    if (!params.userId) {
        const lifelines = normalizeLifelines(params.anonState);
        const solved = new Set(params.anonState?.solvedIndices ?? []);
        const result = computeRevealLetter(
            challenge,
            blank,
            lifelines,
            solved,
            Math.max(0, params.anonState?.wrongGuessesCount ?? 0),
            Math.max(0, params.anonState?.hintsUsedCount ?? 0),
        );
        if ("error" in result) return result;
        return {
            position: result.position,
            char: result.char,
            ...result.tail,
        } satisfies RevealLetterResult;
    }

    const { userId } = params;
    return db.transaction(async (tx) => {
        const [u] = await tx
            .select({ id: user.id })
            .from(user)
            .where(eq(user.id, userId))
            .for("update");
        if (!u) return null;

        const [existing] = await tx
            .select()
            .from(gameSessions)
            .where(
                and(
                    eq(gameSessions.userId, userId),
                    eq(gameSessions.challengeId, challenge.id),
                ),
            );

        const lifelines = normalizeLifelines(existing?.usedLifelines);
        const solved = solvedFromProgress(existing?.progress ?? {});
        const result = computeRevealLetter(
            challenge,
            blank,
            lifelines,
            solved,
            existing?.wrongGuessesCount ?? 0,
            existing?.hintsUsedCount ?? 0,
        );
        if ("error" in result) return result;

        await persistLifelines(
            tx,
            userId,
            challenge,
            existing,
            result.nextLifelines,
            result.tail,
        );

        return {
            position: result.position,
            char: result.char,
            ...result.tail,
        } satisfies RevealLetterResult;
    });
}

export async function unlockOptions(
    db: Db,
    params: {
        userId?: string;
        challengeId: number;
        blankIndex: number;
        anonState?: AnonLifelines;
        autoAssist?: boolean;
    },
) {
    const [challenge] = await db
        .select()
        .from(dailyChallenges)
        .where(eq(dailyChallenges.id, params.challengeId));

    const blank = challenge?.blanks.find((b) => b.index === params.blankIndex);
    if (!challenge || !blank || challenge.playDate > getSkopjeDateString()) {
        return null;
    }

    if (!params.userId) {
        // Anonymous trust model: honor the client's autoAssist flag; sync re-verifies.
        const lifelines = normalizeLifelines(params.anonState);
        const solved = new Set(params.anonState?.solvedIndices ?? []);
        const result = computeUnlockOptions(
            challenge,
            blank,
            lifelines,
            solved,
            Math.max(0, params.anonState?.wrongGuessesCount ?? 0),
            Math.max(0, params.anonState?.hintsUsedCount ?? 0),
            params.autoAssist === true,
        );
        if ("error" in result) return result;
        return {
            options: result.options,
            ...result.tail,
        } satisfies UnlockOptionsResult;
    }

    const { userId } = params;
    return db.transaction(async (tx) => {
        const [u] = await tx
            .select({ id: user.id })
            .from(user)
            .where(eq(user.id, userId))
            .for("update");
        if (!u) return null;

        const [existing] = await tx
            .select()
            .from(gameSessions)
            .where(
                and(
                    eq(gameSessions.userId, userId),
                    eq(gameSessions.challengeId, challenge.id),
                ),
            );

        const lifelines = normalizeLifelines(existing?.usedLifelines);
        const solved = solvedFromProgress(existing?.progress ?? {});
        // Server-verified auto-assist: free only after 3 wrong attempts on this blank.
        const freeAssist =
            params.autoAssist === true &&
            (existing?.progress?.[blank.index]?.wrongAttempts ?? 0) >= 3;
        const result = computeUnlockOptions(
            challenge,
            blank,
            lifelines,
            solved,
            existing?.wrongGuessesCount ?? 0,
            existing?.hintsUsedCount ?? 0,
            freeAssist,
        );
        if ("error" in result) return result;

        await persistLifelines(
            tx,
            userId,
            challenge,
            existing,
            result.nextLifelines,
            result.tail,
        );

        return {
            options: result.options,
            ...result.tail,
        } satisfies UnlockOptionsResult;
    });
}

export async function submitRealityCheck(
    db: Db,
    params: { userId?: string; challengeId: number; choiceIndex: number },
) {
    const [challenge] = await db
        .select()
        .from(dailyChallenges)
        .where(eq(dailyChallenges.id, params.challengeId));

    if (!challenge || challenge.playDate > getSkopjeDateString()) return null;
    const realityCheck = challenge.realityCheck;
    if (!realityCheck) {
        return { error: "Овој предизвик нема проверка на реалноста." };
    }

    const choiceIndex = params.choiceIndex;
    if (!Number.isInteger(choiceIndex) || choiceIndex < 0 || choiceIndex > 2) {
        return { error: "Невалиден одговор." };
    }

    const correctIndex = realityCheck.correctIndex;
    const correct = choiceIndex === correctIndex;
    const techniqueId = challenge.techniqueId ?? null;

    if (!params.userId) {
        return {
            correct,
            correctIndex,
            techniqueId,
            alreadyAnswered: false,
        } satisfies RealityCheckResult;
    }

    const { userId } = params;
    return db.transaction(async (tx) => {
        const [u] = await tx
            .select({ id: user.id, totalPoints: user.totalPoints })
            .from(user)
            .where(eq(user.id, userId))
            .for("update");
        if (!u) return null;

        const [existing] = await tx
            .select()
            .from(gameSessions)
            .where(
                and(
                    eq(gameSessions.userId, userId),
                    eq(gameSessions.challengeId, challenge.id),
                ),
            );

        if (existing && existing.realityChoiceIndex !== null) {
            return {
                correct: Boolean(existing.realityCorrect),
                correctIndex,
                techniqueId,
                alreadyAnswered: true,
            } satisfies RealityCheckResult;
        }

        if (!existing?.completed) {
            return {
                error: "Проверката на реалноста е достапна само по завршување на предизвикот.",
            };
        }

        await tx
            .update(gameSessions)
            .set({
                realityChoiceIndex: choiceIndex,
                realityCorrect: correct,
            })
            .where(
                and(
                    eq(gameSessions.userId, userId),
                    eq(gameSessions.challengeId, challenge.id),
                ),
            );

        if (correct) {
            await tx
                .update(user)
                .set({
                    totalPoints: u.totalPoints + 150,
                    updatedAt: new Date(),
                })
                .where(eq(user.id, userId));
            await awardBadgeByName(tx, userId, "Факт-чекер");
        }

        return {
            correct,
            correctIndex,
            techniqueId,
            alreadyAnswered: false,
        } satisfies RealityCheckResult;
    });
}

export async function syncAnonSessionToDb(
    db: Db,
    userId: string,
    payload: {
        challengeId: number;
        wrongGuessesCount: number;
        hintsUsedCount: number;
        progress: Record<number, BlankProgressState>;
        usedLifelines?: UsedLifelines;
        freeAssists?: number[];
        realityChoiceIndex?: number | null;
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

    // Re-derive revealed positions/chars server-side; never trust client chars.
    const usedLifelines: UsedLifelines = {
        revealedLetters: {},
        optionsUnlocked: [],
        freeAssists: [],
    };
    for (const blankItem of challenge.blanks) {
        const positions = Array.from(
            new Set(
                payload.usedLifelines?.revealedLetters?.[blankItem.index] ?? [],
            ),
        )
            .filter(
                (position) =>
                    Number.isInteger(position) &&
                    position >= 0 &&
                    position < blankItem.answer.length,
            )
            .sort((a, b) => a - b);
        if (positions.length > 0) {
            usedLifelines.revealedLetters[blankItem.index] = positions;
        }
    }
    const unlockable = new Set(
        challenge.blanks
            .filter((b) => (b.decoys?.length ?? 0) >= 3)
            .map((b) => b.index),
    );
    usedLifelines.optionsUnlocked = Array.from(
        new Set(payload.usedLifelines?.optionsUnlocked ?? []),
    ).filter((index) => unlockable.has(index));

    // Free auto-assist claims are only honored when the sanitized progress
    // proves the player was stuck on an unlockable blank; never charged.
    usedLifelines.freeAssists = Array.from(
        new Set(payload.freeAssists ?? []),
    ).filter(
        (index) =>
            unlockable.has(index) &&
            (sanitizedProgress[index]?.wrongAttempts ?? 0) >= 3,
    );

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

    const lifelineCounts = countLifelines(usedLifelines);
    const score = calculateSessionScoreV2(
        finalWrong,
        lifelineCounts.letters,
        lifelineCounts.options,
    );
    const allSolved = challenge.blanks.every(
        (b) => sanitizedProgress[b.index]?.solved === true,
    );
    const completed = allSolved || score === 0;
    const won = allSolved && score > 0;

    if (completed) {
        revealCompletedProgress(challenge.blanks, sanitizedProgress);
    }

    const realityCheck = challenge.realityCheck;
    const realityChoiceIndex =
        typeof payload.realityChoiceIndex === "number" &&
        Number.isInteger(payload.realityChoiceIndex) &&
        payload.realityChoiceIndex >= 0 &&
        payload.realityChoiceIndex <= 2
            ? payload.realityChoiceIndex
            : null;
    const hasValidRealityChoice =
        realityCheck != null && realityChoiceIndex !== null;
    const realityCorrect = hasValidRealityChoice
        ? realityChoiceIndex === realityCheck.correctIndex
        : false;

    await db.transaction(async (tx) => {
        const inserted = await tx
            .insert(gameSessions)
            .values({
                userId,
                challengeId: challenge.id,
                isFreePlay: false,
                score,
                wrongGuessesCount: finalWrong,
                hintsUsedCount: finalHints,
                progress: sanitizedProgress,
                usedLifelines,
                completed,
                completedAt: completed ? new Date() : null,
                realityChoiceIndex,
                realityCorrect: hasValidRealityChoice ? realityCorrect : null,
            })
            .onConflictDoNothing()
            .returning({ id: gameSessions.id });

        if (inserted.length === 0) return;

        if (completed && won) {
            await awardDailyStreakAndPoints(
                tx,
                userId,
                challenge.playDate,
                score,
                false,
            );
            if (!hasAnyLifeline(usedLifelines)) {
                await awardBadgeByName(tx, userId, "Без помош");
            }
        }

        if (hasValidRealityChoice && realityCorrect) {
            const [u] = await tx
                .select({ totalPoints: user.totalPoints })
                .from(user)
                .where(eq(user.id, userId));
            if (u) {
                await tx
                    .update(user)
                    .set({
                        totalPoints: u.totalPoints + 150,
                        updatedAt: new Date(),
                    })
                    .where(eq(user.id, userId));
            }
            await awardBadgeByName(tx, userId, "Факт-чекер");
        }
    });
}
