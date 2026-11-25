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
              <img src="/assets/lv-logo.svg" alt="Лажни вести?" class="h-5 w-auto" />
            </span>
            <ScoreHud
              :score="challenge.score"
              :wrong-guesses="challenge.wrongGuessesCount"
              :hints-used="challenge.hintsUsedCount"
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
            <HeadlineBoard
              :challenge="challenge"
              :segments="segments"
              :busy="isBusy || challenge.completed"
              @guess="onGuess"
              @focus="(i) => (activeBlank = i)"
            />

            <div v-if="!challenge.completed" class="mt-5 flex flex-wrap items-center justify-between gap-2 border-t-2 border-ink/10 pt-4">
              <p class="text-xs font-bold text-ink-soft">
                Напишете го зборот и притиснете <kbd class="rounded-md border-2 border-ink bg-card px-1 font-sans shadow-hard-sm">Enter</kbd> · решени {{ solvedCount }}/{{ challenge.blanks.length }}
              </p>
              <div class="flex gap-2">
                <button type="button" class="btn btn-secondary btn-sm" :disabled="isBusy || !canHint" @click="hintActive">Хинт −250</button>
                <button type="button" class="btn btn-primary btn-sm" :disabled="isBusy || activeBlank === null" @click="submitActive">Погоди</button>
              </div>
            </div>

            <div v-else class="mt-5 flex flex-wrap items-center justify-between gap-2 border-t-2 border-ink/10 pt-4">
              <p class="text-sm font-bold text-ink">{{ challenge.won ? "Решено" : "Не е решено" }} · {{ challenge.score }}/1000</p>
              <button type="button" class="btn btn-secondary btn-sm" @click="showSummary = true">Прикажи резултат</button>
            </div>

            <p v-if="wrongFeedback" role="status" class="mt-2 text-sm font-medium text-wrong">Не е тоа — обидете се повторно.</p>
            <p v-if="error" role="alert" class="mt-2 text-sm font-medium text-wrong">{{ error }}</p>
            <div v-if="activeHintText" class="mt-3 rounded-r-lg border-l-4 border-amber-500 bg-amber-100 px-3 py-2 text-sm font-medium text-ink">
              <span class="font-bold text-amber-700">Хинт ({{ (activeBlank ?? 0) + 1 }}):</span> {{ activeHintText }}
            </div>
          </div>
        </div>

        <AnonSyncBanner :show="!pageContext.user && !challenge.completed" />
      </div>
    </template>

    <GameSummaryModal
      v-if="showSummary && challenge"
      :original-title="challenge.originalTitle"
      :source-name="challenge.sourceName"
      :source-url="challenge.sourceUrl"
      :score="challenge.score"
      :won="challenge.won"
      :play-date="challenge.playDate"
      :wrong-guesses="challenge.wrongGuessesCount"
      :hints-used="challenge.hintsUsedCount"
      :is-archive="isArchive"
      :tm-active="isArchive && challenge.canUseTimeMachine"
      @close="onSummaryClose"
    />
  </div>
</template>

<script setup lang="ts">
import { reload } from "vike/client/router";
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
const { challenge, segments, isBusy, submitGuess, unlockHint } =
    useGameSession(initialChallenge);

const error = ref<string | null>(null);
const showSummary = ref(false);

const activeBlank = ref<number | null>(null);
const wrongFeedback = ref(false);
let feedbackTimer: ReturnType<typeof setTimeout> | undefined;

const solvedCount = computed(
    () => challenge.value?.blanks.filter((b) => b.solved).length ?? 0,
);
const activeBlankObj = computed(
    () =>
        challenge.value?.blanks.find((b) => b.index === activeBlank.value) ??
        null,
);
const canHint = computed(
    () =>
        Boolean(challenge.value && !challenge.value.completed) &&
        (challenge.value?.score ?? 0) > 250 &&
        activeBlankObj.value !== null &&
        !activeBlankObj.value.solved &&
        !activeBlankObj.value.hintUsed,
);
const activeHintText = computed(
    () => activeBlankObj.value?.revealedHint ?? null,
);

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

async function onHint(blankIndex: number) {
    error.value = null;
    wrongFeedback.value = false;
    try {
        await unlockHint(blankIndex);
        if (activeBlank.value !== null) focusBlankInput(activeBlank.value);
    } catch (e) {
        error.value = errMessage(e);
    }
}

function hintActive() {
    if (activeBlank.value !== null) onHint(activeBlank.value);
}

function submitActive() {
    if (activeBlank.value === null) return;
    const input = document.querySelector<HTMLInputElement>(
        `input[data-blank-index="${activeBlank.value}"]`,
    );
    onGuess(activeBlank.value, input?.value.trim() ?? "");
}

const seenKey = computed(() =>
    challenge.value ? `lv_summary_seen_${challenge.value.playDate}` : "",
);
const statsKey = computed(() =>
    challenge.value ? `lv_stats_refreshed_${challenge.value.playDate}` : "",
);

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

function markSeen() {
    if (seenKey.value) localStorage.setItem(seenKey.value, "1");
}

onMounted(() => {
    if (challenge.value?.completed) {
        if (!localStorage.getItem(seenKey.value)) {
            showSummary.value = true;
            markSeen();
        }
    } else if (challenge.value) {
        const first = challenge.value.blanks.find((b) => !b.solved);
        if (first) {
            activeBlank.value = first.index;
            focusBlankInput(first.index);
        }
    }
});

onBeforeUnmount(() => clearTimeout(feedbackTimer));

watch(
    () => challenge.value?.completed,
    (done) => {
        if (!done) return;
        activeBlank.value = null;
        if (!localStorage.getItem(seenKey.value)) {
            showSummary.value = true;
            markSeen();
        }
    },
);
</script>
