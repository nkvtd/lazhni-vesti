import { usePageContext } from "vike-vue/usePageContext";
import { computed, onMounted, ref } from "vue";
import type { getChallengeForClient } from "../database/drizzle/queries/challenges";
import { calculateSessionScore } from "../database/drizzle/queries/gameplay";
import type { BlankProgressState } from "../database/drizzle/schema";
import {
    type AnonClientState,
    onSubmitGuess,
    onSyncAnonymousSession,
    onUnlockHint,
} from "../pages/index/Game.telefunc";

export type ClientChallenge = NonNullable<
    Awaited<ReturnType<typeof getChallengeForClient>>
>;

export function useGameSession(initialChallenge: ClientChallenge | null) {
    const pageContext = usePageContext();
    const challenge = ref<ClientChallenge | null>(
        initialChallenge ? structuredClone(initialChallenge) : null,
    );
    const isBusy = ref(false);

    const storageKey = computed(() =>
        challenge.value ? `lv_anon_${challenge.value.playDate}` : "",
    );

    const segments = computed(() => {
        if (!challenge.value) return [];
        return challenge.value.templateTitle
            .split(/(\{\{\d+\}\})/g)
            .filter(Boolean)
            .map((part) => {
                const match = part.match(/^\{\{(\d+)\}\}$/);
                return match
                    ? { isBlank: true as const, blankIndex: Number(match[1]) }
                    : { isBlank: false as const, text: part };
            });
    });

    function getAnonState(): AnonClientState | undefined {
        if (!challenge.value || pageContext.user) return undefined;
        return {
            wrongGuessesCount: challenge.value.wrongGuessesCount,
            hintsUsedCount: challenge.value.hintsUsedCount,
            solvedIndices: challenge.value.blanks
                .filter((b) => b.solved)
                .map((b) => b.index),
            hintedIndices: challenge.value.blanks
                .filter((b) => b.hintUsed)
                .map((b) => b.index),
        };
    }

    onMounted(async () => {
        if (!challenge.value || !storageKey.value) return;
        const raw = localStorage.getItem(storageKey.value);
        if (!raw) return;

        try {
            const saved = JSON.parse(raw) as {
                challengeId: number;
                wrongGuessesCount: number;
                hintsUsedCount: number;
                progress: Record<number, BlankProgressState>;
                sourceUrl?: string;
                originalTitle?: string;
            };
            if (saved.challengeId !== challenge.value.id) return;

            if (pageContext.user) {
                await onSyncAnonymousSession(saved);
                localStorage.removeItem(storageKey.value);
                window.location.reload();
            } else {
                challenge.value.wrongGuessesCount = saved.wrongGuessesCount;
                challenge.value.hintsUsedCount = saved.hintsUsedCount;
                challenge.value.score = calculateSessionScore(
                    saved.wrongGuessesCount,
                    saved.hintsUsedCount,
                );
                for (const b of challenge.value.blanks) {
                    const p = saved.progress[b.index];
                    if (p) Object.assign(b, p);
                }
                const allSolved = challenge.value.blanks.every((b) => b.solved);
                challenge.value.completed =
                    allSolved || challenge.value.score === 0;
                challenge.value.won = allSolved && challenge.value.score > 0;
                challenge.value.sourceUrl = saved.sourceUrl;
                challenge.value.originalTitle = saved.originalTitle;
            }
        } catch {
            localStorage.removeItem(storageKey.value);
        }
    });

    function saveAnonToLocal() {
        if (!challenge.value || pageContext.user) return;
        const progress: Record<number, BlankProgressState> = {};
        for (const b of challenge.value.blanks) {
            progress[b.index] = {
                solved: b.solved,
                hintUsed: b.hintUsed,
                wrongAttempts: b.wrongAttempts,
                revealedAnswer: b.revealedAnswer,
                revealedHint: b.revealedHint,
            };
        }
        localStorage.setItem(
            storageKey.value,
            JSON.stringify({
                challengeId: challenge.value.id,
                wrongGuessesCount: challenge.value.wrongGuessesCount,
                hintsUsedCount: challenge.value.hintsUsedCount,
                progress,
                sourceUrl: challenge.value.sourceUrl,
                originalTitle: challenge.value.originalTitle,
            }),
        );
    }

    function applyServerResponse(
        blankIndex: number,
        res: Awaited<ReturnType<typeof onSubmitGuess>>,
        isHint: boolean,
    ) {
        if (!challenge.value) return;
        const blank = challenge.value.blanks.find(
            (b) => b.index === blankIndex,
        );
        if (blank) {
            if (isHint) {
                blank.hintUsed = true;
                if (res.revealedHint) blank.revealedHint = res.revealedHint;
            } else if (res.correct) {
                blank.solved = true;
                if (res.revealedAnswer) {
                    blank.revealedAnswer = res.revealedAnswer;
                }
            } else {
                blank.wrongAttempts += 1;
            }
        }

        challenge.value.score = res.score;
        challenge.value.wrongGuessesCount = res.wrongGuessesCount;
        challenge.value.hintsUsedCount = res.hintsUsedCount;
        challenge.value.completed = res.completed;
        challenge.value.won = res.won;

        if (res.completed) {
            challenge.value.sourceUrl = res.sourceUrl;
            challenge.value.originalTitle = res.originalTitle;
            if (res.allAnswers) {
                for (const b of challenge.value.blanks) {
                    b.revealedAnswer =
                        res.allAnswers[b.index] ?? b.revealedAnswer;
                }
            }
        }

        if (!pageContext.user) {
            saveAnonToLocal();
        }
    }

    async function submitGuess(blankIndex: number, guess: string) {
        if (!challenge.value || challenge.value.completed || isBusy.value) {
            return false;
        }
        isBusy.value = true;
        try {
            const res = await onSubmitGuess(
                challenge.value.id,
                blankIndex,
                guess,
                getAnonState(),
            );
            applyServerResponse(blankIndex, res, false);
            return res.correct;
        } finally {
            isBusy.value = false;
        }
    }

    async function unlockHint(blankIndex: number) {
        if (!challenge.value || challenge.value.completed || isBusy.value) {
            return;
        }
        isBusy.value = true;
        try {
            const res = await onUnlockHint(
                challenge.value.id,
                blankIndex,
                getAnonState(),
            );
            applyServerResponse(blankIndex, res, true);
            return res.revealedHint;
        } finally {
            isBusy.value = false;
        }
    }

    return {
        challenge,
        segments,
        isBusy,
        submitGuess,
        unlockHint,
    };
}
