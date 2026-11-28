<template>
  <div>
    <div v-if="!challenge" class="card mx-auto mt-8 max-w-xl p-8 text-center">
      <h2 class="font-display text-xl font-bold text-ink">Денес нема предизвик</h2>
      <p class="mt-2 text-sm text-ink-soft">Уредникот сè уште не го објавил дневниот наслов. Вратете се подоцна.</p>
    </div>

    <template v-else>
      <div class="w-full">
        <div class="card overflow-hidden">
          <div class="flex flex-wrap items-center justify-between gap-2 border-b-2 border-ink bg-ink px-4 py-2.5">
            <span class="inline-flex items-center rounded-md bg-paper px-1.5 py-1">
              <img src="/assets/lv_logo.svg" alt="Лажни вести?" class="h-5 w-auto" />
            </span>
            <ScoreHud
              :score="challenge.score"
              :wrong-guesses="challenge.wrongGuessesCount"
              :letters-revealed="lettersRevealedCount"
              :solved-count="solvedCount"
              :total-blanks="challenge.blanks.length"
              :streak="pageContext.user?.currentStreak ?? 0"
            />
          </div>

          <div v-if="isArchive" class="flex items-start gap-3 border-b-2 border-ink bg-accent-soft px-4 py-3">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mt-0.5 size-5 shrink-0" :class="challenge.canUseTimeMachine ? 'text-ink' : 'text-ink-soft'" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <div class="min-w-0">
              <p class="text-sm font-bold text-ink">{{ challenge.canUseTimeMachine ? "Time Machine активен!" : challenge.completed ? "Завршен архивски предизвик" : "Слободна игра — без глобални поени." }}</p>
              <p v-if="challenge.canUseTimeMachine" class="text-sm text-ink-soft">Победа чини 1500 поени и го бележи денот како освоен — серијата расте само ако датумот се надоврзува на вашите освоени денови.</p>
              <p v-else-if="challenge.timeMachineReason" class="text-sm text-ink-soft">{{ challenge.timeMachineReason }}</p>
              <p v-else-if="!challenge.completed" class="text-sm text-ink-soft">Најавете се за да активирате Time Machine.</p>
            </div>
          </div>

          <div class="p-5 sm:p-6 lg:p-8">
            <details v-if="challenge.eventContext" class="group mb-5 rounded-md border-2 border-ink/15 bg-accent-soft/40">
              <summary class="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 [&::-webkit-details-marker]:hidden">
                <span class="flex items-center gap-2 text-sm font-bold text-ink">Што се случи?</span>
                <span class="chip border-ink/15 bg-card">Без казна</span>
              </summary>
              <p class="border-t-2 border-ink/10 px-3 py-2 text-sm text-ink-soft">{{ challenge.eventContext }}</p>
            </details>

            <HeadlineBoard
              :challenge="challenge"
              :segments="segments"
              :busy="isBusy || challenge.completed"
              @guess="onGuess"
              @focus="(i) => (activeBlank = i)"
            />

            <div v-if="!challenge.completed && activeBlankObj" class="mt-5 rounded-md border-2 border-ink/15 bg-card p-3">
              <p class="text-xs font-bold uppercase tracking-wide text-ink-soft">Збор {{ activeBlankObj.index + 1 }} · {{ activeBlankObj.answerLength }} букви</p>
              <div class="mt-2 flex flex-wrap gap-1">
                <span
                  v-for="pos in activeBlankObj.answerLength"
                  :key="pos"
                  aria-hidden="true"
                  class="inline-flex size-6 items-center justify-center rounded-sm border-2 border-ink text-xs font-bold"
                  :class="revealedChar(activeBlankObj, pos - 1) ? 'bg-accent text-white' : 'bg-ink/10'"
                >{{ revealedChar(activeBlankObj, pos - 1) ?? "_" }}</span>
              </div>

              <p class="mt-2 text-sm italic text-ink-soft">„{{ activeBlankObj.hint }}“</p>

              <div v-if="activeBlankObj.letterFeedback" class="mt-2 flex flex-wrap gap-1">
                <span
                  v-for="(fb, i) in activeBlankObj.letterFeedback"
                  :key="i"
                  class="inline-flex size-6 items-center justify-center rounded-sm border-2 border-ink text-xs font-bold"
                  :class="fb.status === 'exact' ? 'bg-accent text-white' : fb.status === 'misplaced' ? 'bg-amber-400 text-[#1c1b18]' : 'bg-ink/10 text-ink-soft'"
                >{{ fb.char }}</span>
              </div>

              <div v-if="activeBlankObj.options" class="mt-3 flex flex-wrap gap-2">
                <button
                  v-for="opt in activeBlankObj.options"
                  :key="opt"
                  type="button"
                  class="btn btn-secondary btn-sm"
                  :aria-label="`Избери опција: ${opt}`"
                  :disabled="isBusy"
                  @click="onOptionGuess(opt)"
                >{{ opt }}</button>
              </div>

              <p v-if="autoAssistedBlank === activeBlank" role="status" class="mt-2 text-sm text-ink-soft">Опциите се отклучени автоматски — без казна.</p>
            </div>

            <div v-if="!challenge.completed" class="mt-5 flex flex-wrap items-center justify-between gap-2 border-t-2 border-ink/10 pt-4">
              <p class="text-xs font-bold text-ink-soft">
                Напишете го зборот и притиснете <kbd class="rounded-md border-2 border-ink bg-card px-1 font-sans shadow-hard-sm">Enter</kbd> · решени {{ solvedCount }}/{{ challenge.blanks.length }}
              </p>
              <div class="flex flex-wrap gap-2">
                <button type="button" class="btn btn-secondary btn-sm" :disabled="isBusy || !canRevealLetter" @click="onRevealLetter">Откриј буква −40</button>
                <button v-if="activeBlankObj?.hasDecoys" type="button" class="btn btn-secondary btn-sm" :disabled="isBusy || !canUnlockOptions" @click="onUnlockOptions(false)">4 опции −80</button>
                <button type="button" class="btn btn-primary btn-sm" :disabled="isBusy || activeBlank === null" @click="submitActive">Погоди</button>
              </div>
            </div>

            <div v-else class="mt-5 flex flex-wrap items-center justify-between gap-2 border-t-2 border-ink/10 pt-4">
              <p class="text-sm font-bold text-ink">{{ challenge.won ? "Решено" : "Не е решено" }} · {{ challenge.score }}/1000</p>
              <div class="flex flex-wrap items-center gap-2">
                <a v-if="hasPartTwo && !pageContext.user" href="/login?redirect=/play" class="btn btn-primary btn-sm">Најави се за дел 2 →</a>
                <button v-else-if="hasPartTwo" type="button" class="btn btn-primary btn-sm" @click="goPartTwo">Продолжи кон дел 2 →</button>
                <button v-if="hasPartTwo" type="button" class="btn btn-secondary btn-sm" @click="showSummary = true">Заврши тука</button>
                <button v-if="!hasPartTwo" type="button" class="btn btn-secondary btn-sm" @click="showSummary = true">Прикажи резултат</button>
              </div>
            </div>

            <p v-if="wrongFeedback" role="status" class="mt-2 text-sm font-medium text-wrong">Не е тоа — обидете се повторно.</p>
            <p v-if="error" role="alert" class="mt-2 text-sm font-medium text-wrong">{{ error }}</p>
          </div>
        </div>

        <AnonSyncBanner :show="!pageContext.user && !challenge.completed" />
      </div>
    </template>

    <GameSummaryModal
      v-if="showSummary && challenge"
      :challenge="challenge"
      :is-archive="isArchive"
      :streak="pageContext.user?.currentStreak ?? 0"
      @close="onSummaryClose"
    />
  </div>
</template>

<script setup lang="ts">
import { navigate, reload } from "vike/client/router";
import { usePageContext } from "vike-vue/usePageContext";
import {
    computed,
    nextTick,
    onBeforeUnmount,
    onMounted,
    ref,
    watch,
} from "vue";
import {
    type ClientChallenge,
    useGameSession,
} from "../../composables/useGameSession";
import { errMessage } from "../../utils/error";
// biome-ignore lint/correctness/noUnusedImports: used in <template> only
import AnonSyncBanner from "./AnonSyncBanner.vue";
// biome-ignore lint/correctness/noUnusedImports: used in <template> only
import GameSummaryModal from "./GameSummaryModal.vue";
// biome-ignore lint/correctness/noUnusedImports: used in <template> only
import HeadlineBoard from "./HeadlineBoard.vue";
// biome-ignore lint/correctness/noUnusedImports: used in <template> only
import ScoreHud from "./ScoreHud.vue";

const { initialChallenge, isArchive = false } = defineProps<{
    initialChallenge: ClientChallenge | null;
    isArchive?: boolean;
}>();

const pageContext = usePageContext();
const {
    challenge,
    segments,
    isBusy,
    submitGuess,
    revealLetter,
    unlockOptions,
} = useGameSession(initialChallenge);

const error = ref<string | null>(null);
const showSummary = ref(false);

const activeBlank = ref<number | null>(null);
const wrongFeedback = ref(false);
const autoAssistedBlank = ref<number | null>(null);
const autoAssistFired = new Set<number>();
let feedbackTimer: ReturnType<typeof setTimeout> | undefined;

const solvedCount = computed(
    () => challenge.value?.blanks.filter((b) => b.solved).length ?? 0,
);
const lettersRevealedCount = computed(
    () =>
        challenge.value?.blanks.reduce(
            (sum, b) => sum + b.revealedLetters.length,
            0,
        ) ?? 0,
);
const activeBlankObj = computed(
    () =>
        challenge.value?.blanks.find((b) => b.index === activeBlank.value) ??
        null,
);
const canRevealLetter = computed(() => {
    const b = activeBlankObj.value;
    return Boolean(
        challenge.value &&
            !challenge.value.completed &&
            b &&
            !b.solved &&
            (challenge.value.score ?? 0) > 40 &&
            b.revealedLetters.length < b.answerLength,
    );
});
const canUnlockOptions = computed(() => {
    const b = activeBlankObj.value;
    return Boolean(
        challenge.value &&
            !challenge.value.completed &&
            b &&
            !b.solved &&
            !b.options &&
            (challenge.value.score ?? 0) > 80,
    );
});

function revealedChar(
    blank: NonNullable<typeof activeBlankObj.value>,
    position: number,
): string | undefined {
    return blank.revealedLetters.find((l) => l.position === position)?.char;
}

function focusBlankInput(index: number) {
    // biome-ignore lint/style/useVueNextTickPromise: callback form keeps focus logic local
    nextTick(() => {
        document
            .querySelector<HTMLInputElement>(
                `input[data-blank-index="${index}"]`,
            )
            ?.focus();
    });
}

async function onGuess(blankIndex: number, word: string) {
    error.value = null;
    wrongFeedback.value = false;
    if (!word) return;
    try {
        const correct = await submitGuess(blankIndex, word);
        if (correct) {
            const next = challenge.value?.blanks.find((b) => !b.solved);
            if (next) {
                activeBlank.value = next.index;
                focusBlankInput(next.index);
            }
        } else {
            wrongFeedback.value = true;
            clearTimeout(feedbackTimer);
            feedbackTimer = setTimeout(
                () => (wrongFeedback.value = false),
                2500,
            );
        }
    } catch (e) {
        error.value = errMessage(e);
    }
}

async function onRevealLetter() {
    if (activeBlank.value === null) return;
    error.value = null;
    wrongFeedback.value = false;
    try {
        await revealLetter(activeBlank.value);
    } catch (e) {
        error.value = errMessage(e);
    }
}

async function onUnlockOptions(autoAssist = false) {
    if (activeBlank.value === null) return;
    error.value = null;
    wrongFeedback.value = false;
    try {
        await unlockOptions(activeBlank.value, autoAssist);
    } catch (e) {
        error.value = errMessage(e);
    }
}

function onOptionGuess(option: string) {
    if (activeBlank.value !== null) onGuess(activeBlank.value, option);
}

function submitActive() {
    if (activeBlank.value === null) return;
    const input = document.querySelector<HTMLInputElement>(
        `input[data-blank-index="${activeBlank.value}"]`,
    );
    onGuess(activeBlank.value, input?.value.trim() ?? "");
}

const hasPartTwo = computed(() =>
    Boolean(
        challenge.value?.realityCheck &&
            challenge.value?.techniqueId &&
            !challenge.value?.isFreePlay,
    ),
);
const statsKey = computed(() =>
    challenge.value ? `lv_stats_refreshed_${challenge.value.playDate}` : "",
);

function goPartTwo() {
    if (!challenge.value) return;
    navigate(isArchive ? `/debrief/${challenge.value.playDate}` : "/debrief");
}

function onSummaryClose() {
    showSummary.value = false;
    if (
        statsKey.value &&
        !localStorage.getItem(statsKey.value) &&
        challenge.value?.completed &&
        challenge.value.won &&
        !challenge.value.isFreePlay &&
        pageContext.user
    ) {
        localStorage.setItem(statsKey.value, "1");
        reload(); // re-fetch pageContext.user; completed board re-renders solved from DB
    }
}

onMounted(() => {
    const first = challenge.value?.blanks.find((b) => !b.solved);
    if (first) {
        activeBlank.value = first.index;
        focusBlankInput(first.index);
    }
});

onBeforeUnmount(() => clearTimeout(feedbackTimer));

// Auto-assist: after 3 wrong typed guesses on the active blank, unlock options free.
watch(
    () =>
        [
            activeBlank.value,
            activeBlankObj.value?.wrongAttempts,
            isBusy.value,
        ] as const,
    async () => {
        const b = activeBlankObj.value;
        if (
            !challenge.value ||
            challenge.value.completed ||
            isBusy.value ||
            !b ||
            b.solved ||
            !b.hasDecoys ||
            b.options ||
            b.wrongAttempts < 3 ||
            autoAssistFired.has(b.index)
        ) {
            return;
        }
        autoAssistFired.add(b.index);
        try {
            await unlockOptions(b.index, true);
            autoAssistedBlank.value = b.index;
        } catch (e) {
            error.value = errMessage(e);
        }
    },
    { immediate: true },
);
</script>
