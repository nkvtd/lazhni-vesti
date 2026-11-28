import { usePageContext } from "vike-vue/usePageContext";
import { computed, onMounted, ref } from "vue";
import type { getChallengeForClient } from "../database/drizzle/queries/challenges";
import {
    calculateSessionScoreV2,
    type LetterFeedback,
} from "../database/drizzle/queries/gameplay";
import { getSkopjeDateString } from "../database/drizzle/queries/util";
import type {
    BlankProgressState,
    UsedLifelines,
} from "../database/drizzle/schema";
import {
    type AnonClientState,
    onRevealLetter,
    onSubmitGuess,
    onSyncAnonymousSession,
    onUnlockOptions,
} from "../pages/index/Game.telefunc";

type ServerChallenge = NonNullable<
    Awaited<ReturnType<typeof getChallengeForClient>>
>;

/** Server-sanitized challenge plus in-memory-only lifeline state. */
export type ClientChallenge = Omit<ServerChallenge, "blanks"> & {
    /** Blank indexes unlocked by the free auto-assist (client mirror of the server list). */
    freeAssists?: number[];
    blanks: Array<
        ServerChallenge["blanks"][number] & {
            /** Wordle-style feedback from the last wrong typed guess. */
            letterFeedback?: LetterFeedback[];
            /** Deterministic options after the "4 опции" unlock. */
            options?: string[];
        }
    >;
};

type RevealedLetter = { position: number; char: string };

type SavedAnonState = {
    challengeId: number;
    wrongGuessesCount: number;
    hintsUsedCount: number;
    progress: Record<number, BlankProgressState>;
    usedLifelines?: UsedLifelines;
    /** Client-only: characters for revealed positions (server only stores positions). */
    revealedLetterChars?: Record<number, RevealedLetter[]>;
    sourceUrl?: string;
    originalTitle?: string;
    realityChoiceIndex?: number | null;
    realityCorrect?: boolean | null;
};

export function useGameSession(initialChallenge: ClientChallenge | null) {
    const pageContext = usePageContext();
    const challenge = ref<ClientChallenge | null>(
        initialChallenge
            ? structuredClone({
                  ...initialChallenge,
                  // Client mirror of the server's free-assist list.
                  freeAssists: initialChallenge.usedLifelinesFreeAssists ?? [],
              })
            : null,
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
            revealedLetters: Object.fromEntries(
                challenge.value.blanks
                    .filter((b) => b.revealedLetters.length > 0)
                    .map((b) => [
                        b.index,
                        b.revealedLetters.map((l) => l.position),
                    ]),
            ),
            optionsUnlocked: challenge.value.usedLifelinesOptions,
            freeAssists: challenge.value.freeAssists ?? [],
        };
    }

    function saveAnonToLocal() {
        if (!challenge.value || pageContext.user) return;
        const progress: Record<number, BlankProgressState> = {};
        const revealedLetterChars: Record<number, RevealedLetter[]> = {};
        for (const b of challenge.value.blanks) {
            progress[b.index] = {
                solved: b.solved,
                hintUsed: b.hintUsed,
                wrongAttempts: b.wrongAttempts,
                revealedAnswer: b.revealedAnswer,
                revealedHint: b.revealedHint,
            };
            if (b.revealedLetters.length > 0) {
                revealedLetterChars[b.index] = b.revealedLetters;
            }
        }
        const usedLifelines: UsedLifelines = {
            revealedLetters: Object.fromEntries(
                Object.entries(revealedLetterChars).map(([index, letters]) => [
                    index,
                    letters.map((l) => l.position),
                ]),
            ),
            optionsUnlocked: challenge.value.usedLifelinesOptions,
            freeAssists: challenge.value.freeAssists ?? [],
        };
        localStorage.setItem(
            storageKey.value,
            JSON.stringify({
                challengeId: challenge.value.id,
                wrongGuessesCount: challenge.value.wrongGuessesCount,
                hintsUsedCount: challenge.value.hintsUsedCount,
                progress,
                usedLifelines,
                revealedLetterChars,
                sourceUrl: challenge.value.sourceUrl,
                originalTitle: challenge.value.originalTitle,
                realityChoiceIndex: challenge.value.realityChoiceIndex,
                realityCorrect: challenge.value.realityCorrect,
            }),
        );
    }

    function restoreAnon(saved: SavedAnonState) {
        if (!challenge.value) return;
        const lifelines: UsedLifelines = saved.usedLifelines ?? {
            revealedLetters: {},
            optionsUnlocked: [],
            freeAssists: [],
        };
        challenge.value.wrongGuessesCount = saved.wrongGuessesCount;
        challenge.value.hintsUsedCount = saved.hintsUsedCount;
        challenge.value.usedLifelinesOptions = lifelines.optionsUnlocked ?? [];
        challenge.value.freeAssists = lifelines.freeAssists ?? [];
        for (const b of challenge.value.blanks) {
            const p = saved.progress[b.index];
            if (p) Object.assign(b, p);
            b.revealedLetters = saved.revealedLetterChars?.[b.index] ?? [];
        }
        const totalRevealed = Object.values(lifelines.revealedLetters).reduce(
            (sum, positions) => sum + new Set(positions).size,
            0,
        );
        challenge.value.score = calculateSessionScoreV2(
            saved.wrongGuessesCount,
            totalRevealed,
            lifelines.optionsUnlocked?.length ?? 0,
        );
        const allSolved = challenge.value.blanks.every((b) => b.solved);
        challenge.value.completed = allSolved || challenge.value.score === 0;
        challenge.value.won = allSolved && challenge.value.score > 0;
        challenge.value.sourceUrl = saved.sourceUrl;
        challenge.value.originalTitle = saved.originalTitle;
        challenge.value.realityChoiceIndex = saved.realityChoiceIndex ?? null;
        challenge.value.realityCorrect = saved.realityCorrect ?? null;
    }

    function applyScoreTail(res: {
        score: number;
        wrongGuessesCount: number;
        hintsUsedCount: number;
        completed: boolean;
        won: boolean;
        sourceUrl?: string;
        originalTitle?: string;
        allAnswers?: Record<number, string>;
        realityCheck?: ClientChallenge["realityCheck"];
        techniqueId?: string | null;
    }) {
        if (!challenge.value) return;
        challenge.value.score = res.score;
        challenge.value.wrongGuessesCount = res.wrongGuessesCount;
        challenge.value.hintsUsedCount = res.hintsUsedCount;
        challenge.value.completed = res.completed;
        challenge.value.won = res.won;

        if (res.completed) {
            challenge.value.sourceUrl = res.sourceUrl;
            challenge.value.originalTitle = res.originalTitle;
            if (res.realityCheck !== undefined) {
                challenge.value.realityCheck = res.realityCheck;
            }
            if (res.techniqueId !== null && res.techniqueId !== undefined) {
                challenge.value.techniqueId = res.techniqueId;
            }
            if (res.allAnswers) {
                for (const b of challenge.value.blanks) {
                    b.revealedAnswer =
                        res.allAnswers[b.index] ?? b.revealedAnswer;
                }
            }
        }
    }

    onMounted(async () => {
        if (!challenge.value || !storageKey.value) return;
        const raw = localStorage.getItem(storageKey.value);
        if (raw) {
            try {
                const saved = JSON.parse(raw) as SavedAnonState;
                if (saved.challengeId === challenge.value.id) {
                    if (pageContext.user) {
                        if (
                            challenge.value.playDate === getSkopjeDateString()
                        ) {
                            await onSyncAnonymousSession({
                                challengeId: saved.challengeId,
                                wrongGuessesCount: saved.wrongGuessesCount,
                                hintsUsedCount: saved.hintsUsedCount,
                                progress: saved.progress,
                                usedLifelines: saved.usedLifelines,
                                freeAssists:
                                    saved.usedLifelines?.freeAssists ?? [],
                                realityChoiceIndex:
                                    saved.realityChoiceIndex ?? null,
                            });
                            localStorage.removeItem(storageKey.value);
                            window.location.reload();
                            return;
                        }
                        localStorage.removeItem(storageKey.value);
                    } else {
                        restoreAnon(saved);
                    }
                }
            } catch {
                localStorage.removeItem(storageKey.value);
            }
        }

        // Re-derive unlocked options after a refresh via the idempotent unlock call.
        const unlocked = [
            ...challenge.value.usedLifelinesOptions,
            ...(challenge.value.freeAssists ?? []),
        ];
        for (const index of unlocked) {
            const b = challenge.value.blanks.find((x) => x.index === index);
            if (b && !b.solved && !b.options) {
                try {
                    await unlockOptions(index);
                } catch {
                    // Best-effort: options can be re-unlocked by the player.
                }
            }
        }
    });

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
            const blank = challenge.value.blanks.find(
                (b) => b.index === blankIndex,
            );
            if (blank) {
                if (res.correct) {
                    blank.solved = true;
                    if (res.revealedAnswer) {
                        blank.revealedAnswer = res.revealedAnswer;
                    }
                } else {
                    blank.wrongAttempts += 1;
                    if (res.letterFeedback) {
                        blank.letterFeedback = res.letterFeedback;
                    }
                }
            }
            applyScoreTail(res);
            if (!pageContext.user) saveAnonToLocal();
            return res.correct;
        } finally {
            isBusy.value = false;
        }
    }

    async function revealLetter(blankIndex: number): Promise<void> {
        if (!challenge.value || challenge.value.completed || isBusy.value) {
            return;
        }
        isBusy.value = true;
        try {
            const res = await onRevealLetter(
                challenge.value.id,
                blankIndex,
                getAnonState(),
            );
            const blank = challenge.value.blanks.find(
                (b) => b.index === blankIndex,
            );
            if (blank) {
                blank.revealedLetters = [
                    ...blank.revealedLetters,
                    { position: res.position, char: res.char },
                ].sort((a, b) => a.position - b.position);
            }
            applyScoreTail(res);
            if (!pageContext.user) saveAnonToLocal();
        } finally {
            isBusy.value = false;
        }
    }

    async function unlockOptions(
        blankIndex: number,
        autoAssist = false,
    ): Promise<string[] | undefined> {
        if (!challenge.value || challenge.value.completed || isBusy.value) {
            return undefined;
        }
        isBusy.value = true;
        try {
            const res = await onUnlockOptions(
                challenge.value.id,
                blankIndex,
                getAnonState(),
                autoAssist,
            );
            const blank = challenge.value.blanks.find(
                (b) => b.index === blankIndex,
            );
            if (blank) blank.options = res.options;
            // Free auto-assist is not a paid lifeline: mirror it separately.
            const free = challenge.value.freeAssists ?? [];
            if (!free.includes(blankIndex)) {
                if (autoAssist) {
                    challenge.value.freeAssists = [...free, blankIndex];
                } else if (
                    !challenge.value.usedLifelinesOptions.includes(blankIndex)
                ) {
                    challenge.value.usedLifelinesOptions = [
                        ...challenge.value.usedLifelinesOptions,
                        blankIndex,
                    ];
                }
            }
            applyScoreTail(res);
            if (!pageContext.user) saveAnonToLocal();
            return res.options;
        } finally {
            isBusy.value = false;
        }
    }

    return {
        challenge,
        segments,
        isBusy,
        submitGuess,
        revealLetter,
        unlockOptions,
    };
}
