import { Abort, getContext } from "telefunc";
import {
    handleGuessOrHint,
    syncAnonSessionToDb,
} from "../../database/drizzle/queries/gameplay";
import type { BlankProgressState } from "../../database/drizzle/schema";

export type AnonClientState = {
    wrongGuessesCount: number;
    hintsUsedCount: number;
    solvedIndices: number[];
    hintedIndices?: number[];
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

export async function onUnlockHint(
    challengeId: number,
    blankIndex: number,
    anonState?: AnonClientState,
) {
    const { db, user } = getContext();
    const result = await handleGuessOrHint(db, {
        userId: user?.id,
        challengeId,
        blankIndex,
        requestHint: true,
        anonState,
    });

    if (!result) throw Abort("Предизвикот не е пронајден.");
    if ("error" in result) {
        throw Abort(result.error);
    }
    return result;
}

export async function onSyncAnonymousSession(payload: {
    challengeId: number;
    wrongGuessesCount: number;
    hintsUsedCount: number;
    progress: Record<number, BlankProgressState>;
}) {
    const { db, user } = getContext();
    if (!user) throw Abort("Мора да сте најавени.");
    await syncAnonSessionToDb(db, user.id, payload);
}
