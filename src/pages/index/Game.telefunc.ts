import { Abort, getContext } from "telefunc";
import { getTodayCommunityStats } from "../../database/drizzle/queries/challenges";
import {
    handleGuessOrHint,
    revealLetter,
    submitRealityCheck,
    syncAnonSessionToDb,
    unlockOptions,
} from "../../database/drizzle/queries/gameplay";
import type {
    BlankProgressState,
    UsedLifelines,
} from "../../database/drizzle/schema";

export type AnonClientState = {
    wrongGuessesCount: number;
    hintsUsedCount: number;
    solvedIndices: number[];
    revealedLetters?: Record<number, number[]>;
    optionsUnlocked?: number[];
    freeAssists?: number[];
};

export async function onSubmitGuess(
    challengeId: number,
    blankIndex: number,
    guess: string,
    anonState?: AnonClientState,
) {
    const { db, user } = getContext();
    const result = await handleGuessOrHint(db, {
        userId: user?.id,
        challengeId,
        blankIndex,
        guess,
        anonState,
    });

    if (!result) throw Abort("Предизвикот не е пронајден.");
    if ("error" in result) {
        throw Abort(result.error);
    }
    return result;
}

export async function onRevealLetter(
    challengeId: number,
    blankIndex: number,
    anonState?: AnonClientState,
) {
    const { db, user } = getContext();
    const result = await revealLetter(db, {
        userId: user?.id,
        challengeId,
        blankIndex,
        anonState,
    });

    if (!result) throw Abort("Предизвикот не е пронајден.");
    if ("error" in result) {
        throw Abort(result.error);
    }
    return result;
}

export async function onUnlockOptions(
    challengeId: number,
    blankIndex: number,
    anonState?: AnonClientState,
    autoAssist?: boolean,
) {
    const { db, user } = getContext();
    const result = await unlockOptions(db, {
        userId: user?.id,
        challengeId,
        blankIndex,
        anonState,
        autoAssist,
    });

    if (!result) throw Abort("Предизвикот не е пронајден.");
    if ("error" in result) {
        throw Abort(result.error);
    }
    return result;
}

export async function onSubmitRealityCheck(
    challengeId: number,
    choiceIndex: number,
) {
    const { db, user } = getContext();
    const result = await submitRealityCheck(db, {
        userId: user?.id,
        challengeId,
        choiceIndex,
    });

    if (!result) throw Abort("Предизвикот не е пронајден.");
    if ("error" in result) {
        throw Abort(result.error);
    }
    return result;
}

export async function onGetCommunityStats() {
    const { db } = getContext();
    return getTodayCommunityStats(db);
}

export async function onSyncAnonymousSession(payload: {
    challengeId: number;
    wrongGuessesCount: number;
    hintsUsedCount: number;
    progress: Record<number, BlankProgressState>;
    usedLifelines?: UsedLifelines;
    freeAssists?: number[];
    realityChoiceIndex?: number | null;
}) {
    const { db, user } = getContext();
    if (!user) throw Abort("Мора да сте најавени.");
    await syncAnonSessionToDb(db, user.id, payload);
}
