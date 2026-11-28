<template>
  <div class="mx-auto w-full max-w-xl">
    <div class="flex flex-wrap items-baseline justify-between gap-2">
      <a :href="backHref" class="text-sm text-ink-soft hover:text-ink">← Назад кон играта</a>
      <p class="text-xs font-semibold uppercase tracking-[0.25em] text-accent-strong">{{ formatMkDate(challenge.playDate) }}</p>
    </div>

    <section class="card mt-3 p-5">
      <p class="label">Насловот што го решивте</p>
      <h1 class="font-display text-xl font-black leading-snug text-ink">{{ challenge.originalTitle }}</h1>
      <template v-if="challenge.eventContext">
        <p class="label mt-3">Што се случи?</p>
        <p class="text-sm text-ink-soft">{{ challenge.eventContext }}</p>
      </template>
    </section>

    <section v-if="hasQuiz" class="card mt-4 p-5">
      <div class="flex items-start justify-between gap-2">
        <h2 class="font-display text-lg font-black leading-snug text-ink">Која техника на манипулација е користена во овој наслов?</h2>
        <span class="chip shrink-0 border-accent/40 bg-accent-soft font-semibold text-accent-strong">Без ризик · +150</span>
      </div>

      <div class="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          v-for="opt in options"
          :key="opt.id"
          type="button"
          class="btn justify-start text-left leading-snug"
          :class="optionClass(opt.id)"
          :disabled="result !== null"
          @click="answer(opt.id)"
        >
          <span class="min-w-0">{{ opt.id }}</span>
          <span v-if="optionMark(opt.id)" class="ml-auto shrink-0 font-black" aria-hidden="true">{{ optionMark(opt.id) }}</span>
        </button>
      </div>

      <p
        v-if="result"
        role="status"
        class="mt-3 rounded-md border-2 border-ink px-3 py-2 text-sm font-bold text-white"
        :class="result.correct ? 'bg-accent' : 'bg-wrong'"
      >
        <template v-if="result.correct">
          {{ pageContext.user ? "Точно! +150 поени." : "Точно! Најавете се за да ги зачувате +150 поени." }}
        </template>
        <template v-else>Не е точната — вистинската техника е обележана. +0</template>
      </p>

      <p v-if="error" role="alert" class="mt-2 text-sm font-medium text-wrong">{{ error }}</p>
    </section>

    <div v-else class="card mt-4 p-5">
      <p class="text-sm text-ink-soft">Овој предизвик нема дел 2.</p>
    </div>

    <section v-if="reality && technique && result" class="card mt-4 p-5">
      <p class="label">Техника</p>
      <h2 class="font-display text-lg font-bold text-ink">{{ technique.id }}</h2>
      <p class="mt-1 text-sm text-ink-soft">{{ technique.definition }}</p>

      <p class="label mt-3">Како да го препознаеш?</p>
      <ul class="mt-1 space-y-1 text-sm text-ink-soft">
        <li v-for="sign in technique.signs" :key="sign" class="flex items-start gap-1.5">
          <BadgeIcon icon="check" class="mt-0.5 size-4 shrink-0 text-accent" />
          <span>{{ sign }}</span>
        </li>
      </ul>

      <p class="label mt-3">Во денешната вест:</p>
      <p class="mt-1 text-sm text-ink">{{ reality.summaries[reality.correctIndex] }}</p>
      <a
        v-if="challenge.sourceUrl"
        :href="challenge.sourceUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="mt-2 inline-block text-sm font-medium text-accent hover:text-accent-strong"
      >
        Извор: {{ challenge.sourceName }}
      </a>
    </section>

    <section v-if="!hasQuiz || result" class="card mt-4 p-5">
      <h2 class="font-display text-lg font-black text-ink">Завршено</h2>

      <p v-if="!isArchive && stats" class="mt-2 flex flex-wrap items-center gap-2 text-sm text-ink-soft">
        Денес {{ stats.solveRate }}% го решија · просек {{ stats.averageScore }} п.
        <span class="chip shrink-0">{{ stats.completedSessions }} решени</span>
      </p>

      <button type="button" class="btn btn-primary mt-4 w-full" :disabled="copied" @click="copyResult">
        {{ copied ? "Копирано!" : "Сподели резултат" }}
      </button>
      <p v-if="copyFailed" role="alert" class="mt-2 text-sm font-medium text-wrong">Копирањето не успеа — обидете се рачно.</p>

      <div class="mt-4 flex flex-wrap items-center justify-between gap-2">
        <span
          v-if="(pageContext.user?.currentStreak ?? 0) > 0"
          class="chip border-ink bg-amber-400 text-[#1c1b18]"
        >
          <BadgeIcon icon="fire" class="size-3.5" />
          {{ pageContext.user?.currentStreak }} дена
        </span>
        <button type="button" class="btn btn-secondary btn-sm" @click="navigate('/')">Дома →</button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
// biome-ignore lint/correctness/noUnusedImports: used in <template> only
import { navigate } from "vike/client/router";
import { usePageContext } from "vike-vue/usePageContext";
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import type { ClientChallenge } from "../../composables/useGameSession";
import {
    onGetCommunityStats,
    onSubmitRealityCheck,
} from "../../pages/index/Game.telefunc";
import { errMessage } from "../../utils/error";
import { formatMkDate } from "../../utils/format";
import {
    getTechnique,
    MEDIA_TECHNIQUES,
    type MediaTechnique,
} from "../../utils/mediaLiteracy";
// biome-ignore lint/correctness/noUnusedImports: used in <template> only
import BadgeIcon from "../ui/BadgeIcon.vue";

const { challenge, isArchive = false } = defineProps<{
    challenge: ClientChallenge;
    isArchive?: boolean;
}>();

const pageContext = usePageContext();

const reality = computed(() => challenge.realityCheck ?? null);
const technique = computed(() => getTechnique(challenge.techniqueId));
const hasQuiz = computed(() => Boolean(reality.value && challenge.techniqueId));
const backHref = computed(() =>
    isArchive ? `/archive/${challenge.playDate}` : "/play",
);

const error = ref<string | null>(null);
const copied = ref(false);
const copyFailed = ref(false);
const stats = ref<Awaited<ReturnType<typeof onGetCommunityStats>>>(null);
let copiedTimer: ReturnType<typeof setTimeout> | undefined;
let copyFailedTimer: ReturnType<typeof setTimeout> | undefined;

type Result = { picked: string | null; correct: boolean };

const result = ref<Result | null>(
    challenge.realityChoiceIndex === null
        ? null
        : {
              picked: challenge.realityCorrect
                  ? (challenge.techniqueId ?? null)
                  : null,
              correct: Boolean(challenge.realityCorrect),
          },
);

/** Stable pseudo-random rank: the same challenge always yields the same quiz. */
function rank(seed: number, index: number): number {
    let h = (seed * 31 + index * 17) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return (h ^ (h >>> 16)) >>> 0;
}

const options = computed<MediaTechnique[]>(() => {
    const correct = technique.value;
    if (!correct) return [];
    const decoys = MEDIA_TECHNIQUES.filter((t) => t.id !== correct.id)
        .map((t, i) => ({ t, r: rank(challenge.id, i) }))
        .sort((a, b) => a.r - b.r)
        .slice(0, 3)
        .map((x) => x.t);
    return [correct, ...decoys]
        .map((t) => ({
            t,
            r: rank(challenge.id + 7, MEDIA_TECHNIQUES.indexOf(t)),
        }))
        .sort((a, b) => a.r - b.r)
        .map((x) => x.t);
});

const assistedIndices = computed(
    () =>
        new Set([
            ...challenge.usedLifelinesOptions,
            ...(challenge.usedLifelinesFreeAssists ?? []),
        ]),
);

function optionClass(id: string) {
    if (!result.value) return "btn-secondary";
    if (id === challenge.techniqueId) return "btn-primary";
    if (id === result.value.picked) {
        return "border-wrong bg-wrong/10 text-wrong hover:bg-wrong/10";
    }
    return "btn-secondary opacity-70";
}

function optionMark(id: string) {
    if (!result.value) return "";
    if (id === challenge.techniqueId) return "✓";
    return id === result.value.picked ? "✕" : "";
}

async function answer(id: string) {
    // Анонимните корисници не стигаат тука — дел 2 бара најава (гостиската сесија се синхронизира на /play).
    if (result.value || !reality.value) return;
    const correct = id === challenge.techniqueId;
    // The backend only verifies the 3 summaries: pick the correct one, or any other.
    const choiceIndex = correct
        ? reality.value.correctIndex
        : (reality.value.correctIndex + 1) % 3;
    error.value = null;
    try {
        // Commit only after the server confirms; on failure the quiz stays answerable.
        const res = await onSubmitRealityCheck(challenge.id, choiceIndex);
        result.value = { picked: id, correct: res.correct };
    } catch (e) {
        error.value = errMessage(e);
    }
}

async function copyResult() {
    const squares = challenge.blanks
        .map((b) =>
            !b.solved ? "🟥" : assistedIndices.value.has(b.index) ? "🟨" : "🟩",
        )
        .join(" ");
    const parts = [
        `📰 Лажни вести? · ${formatMkDate(challenge.playDate)}`,
        squares,
    ];
    if (technique.value && result.value?.correct) {
        parts.push(`🎓 ${technique.value.id} ✓`);
    }
    parts.push(`🏆 ${challenge.score}/1000`);
    const streak = pageContext.user?.currentStreak ?? 0;
    if (streak > 0) parts.push(`🔥 ${streak} дена`);
    try {
        await navigator.clipboard.writeText(parts.join(" · "));
        copied.value = true;
        copyFailed.value = false;
        clearTimeout(copiedTimer);
        copiedTimer = setTimeout(() => (copied.value = false), 2500);
    } catch {
        copyFailed.value = true;
        clearTimeout(copyFailedTimer);
        copyFailedTimer = setTimeout(() => (copyFailed.value = false), 2500);
    }
}

onMounted(() => {
    if (isArchive) return;
    onGetCommunityStats()
        .then((res) => {
            stats.value = res;
        })
        .catch(() => {
            // Community stats are decorative; hide on failure.
        });
});

onBeforeUnmount(() => {
    clearTimeout(copiedTimer);
    clearTimeout(copyFailedTimer);
});
</script>
