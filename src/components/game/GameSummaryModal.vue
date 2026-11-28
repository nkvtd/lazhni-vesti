<template>
  <div class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/40 p-4 sm:items-center" @click.self="$emit('close')">
    <div role="dialog" aria-modal="true" aria-labelledby="game-summary-title" class="card my-auto w-full max-w-sm overflow-hidden">
      <div class="border-b-2 border-ink px-6 py-4 text-center" :class="challenge.won ? 'bg-accent text-white' : 'bg-ink text-paper'">
        <h2 id="game-summary-title" class="font-display text-2xl font-black">
          {{ challenge.won ? "Го погодивте насловот!" : isArchive ? "Крај на архивскиот предизвик" : "Крај на дневниот предизвик" }}
        </h2>
        <p class="mt-1 font-display text-4xl font-black tabular-nums" :class="challenge.won ? 'text-amber-300' : 'text-amber-400'">{{ challenge.score }}<span class="ml-1 font-sans text-sm font-normal opacity-80">/1000</span></p>
      </div>

      <div class="p-6">
        <dl class="space-y-1.5 text-sm">
          <div class="flex items-center justify-between">
            <dt class="text-ink-soft">Почетни</dt>
            <dd class="font-semibold tabular-nums">1000</dd>
          </div>
          <div class="flex items-center justify-between">
            <dt class="text-ink-soft">Грешки (−30)</dt>
            <dd class="font-semibold tabular-nums" :class="challenge.wrongGuessesCount > 0 ? 'text-wrong' : ''">−{{ challenge.wrongGuessesCount * 30 }}</dd>
          </div>
          <div class="flex items-center justify-between">
            <dt class="text-ink-soft">Откриени букви (−40)</dt>
            <dd class="font-semibold tabular-nums" :class="lettersRevealedCount > 0 ? 'text-wrong' : ''">−{{ lettersRevealedCount * 40 }}</dd>
          </div>
          <div class="flex items-center justify-between">
            <dt class="text-ink-soft">Опции (−80)</dt>
            <dd class="font-semibold tabular-nums" :class="optionsUsedCount > 0 ? 'text-wrong' : ''">−{{ optionsUsedCount * 80 }}</dd>
          </div>
          <div class="flex items-center justify-between border-t border-ink/10 pt-1.5">
            <dt class="font-bold">Вкупно</dt>
            <dd class="font-display font-black tabular-nums">{{ challenge.score }}</dd>
          </div>
        </dl>

        <section v-if="!isArchive && stats" class="mt-4 flex items-start justify-between gap-2 border-t-2 border-ink/10 pt-4">
          <p class="text-sm text-ink-soft">Денес {{ stats.solveRate }}% го решија предизвикот · просек {{ stats.averageScore }} поени.</p>
          <span class="chip shrink-0">{{ stats.completedSessions }} решени</span>
        </section>

        <template v-if="challenge.originalTitle">
          <p class="label mt-4">Вистинскиот наслов</p>
          <p class="font-display text-lg font-bold text-ink">{{ challenge.originalTitle }}</p>
        </template>

        <a
          v-if="challenge.sourceUrl"
          :href="challenge.sourceUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="mt-2 inline-flex items-center gap-1 text-sm font-medium text-accent hover:text-accent-strong"
        >
          Извор: {{ challenge.sourceName }}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="size-4"
            aria-hidden="true"
          >
            <path d="M15 3h6v6" />
            <path d="M10 14 21 3" />
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
          </svg>
        </a>

        <button type="button" class="btn btn-primary mt-5 w-full" :disabled="copied" @click="copyResult">
          <svg
            v-if="copied"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="size-4"
            aria-hidden="true"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
          <svg
            v-else
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="size-4"
            aria-hidden="true"
          >
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" x2="12" y1="2" y2="15" />
          </svg>
          {{ copied ? "Копирано!" : "Сподели резултат" }}
        </button>
        <p v-if="copyFailed" role="alert" class="mt-2 text-sm font-medium text-wrong">Копирањето не успеа — обидете се рачно.</p>

        <button ref="closeBtn" type="button" class="btn btn-secondary mt-2 w-full" @click="$emit('close')">Затвори</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import type { ClientChallenge } from "../../composables/useGameSession";
import { onGetCommunityStats } from "../../pages/index/Game.telefunc";
import { formatMkDate } from "../../utils/format";
import { getTechnique } from "../../utils/mediaLiteracy";

const {
    challenge,
    isArchive = false,
    streak,
} = defineProps<{
    challenge: ClientChallenge;
    isArchive?: boolean;
    streak: number;
}>();

const emit = defineEmits<{ close: [] }>();

const closeBtn = ref<HTMLButtonElement | null>(null);
const copied = ref(false);
const copyFailed = ref(false);
const stats = ref<Awaited<ReturnType<typeof onGetCommunityStats>>>(null);
let copiedTimer: ReturnType<typeof setTimeout> | undefined;
let copyFailedTimer: ReturnType<typeof setTimeout> | undefined;

const lettersRevealedCount = computed(() =>
    challenge.blanks.reduce((sum, b) => sum + b.revealedLetters.length, 0),
);
const optionsUsedCount = computed(() => challenge.usedLifelinesOptions.length);
// Free auto-assists cost nothing but still count as assisted for the share badge.
const assistedIndices = computed(
    () =>
        new Set([
            ...challenge.usedLifelinesOptions,
            ...(challenge.freeAssists ?? []),
            ...(challenge.usedLifelinesFreeAssists ?? []),
        ]),
);

async function copyResult() {
    const squares = challenge.blanks
        .map((b) =>
            !b.solved ? "🟥" : assistedIndices.value.has(b.index) ? "🟨" : "🟩",
        )
        .join(" ");
    const techniqueLabel = getTechnique(challenge.techniqueId)?.id;
    const realityDone = challenge.realityChoiceIndex !== null;
    const parts = [
        `📰 Лажни вести? · ${formatMkDate(challenge.playDate)}`,
        squares,
    ];
    // Spoiler gate: only reveal the technique once the quiz was answered.
    if (techniqueLabel && realityDone) parts.push(`🎓 ${techniqueLabel} ✓`);
    parts.push(`🏆 ${challenge.score}/1000`);
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

function onKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") emit("close");
}

onMounted(async () => {
    document.addEventListener("keydown", onKeydown);

    if (!isArchive) {
        onGetCommunityStats()
            .then((res) => {
                stats.value = res;
            })
            .catch(() => {
                // Community stats are decorative; hide on failure.
            });
    }

    await nextTick();
    closeBtn.value?.focus();
});

onBeforeUnmount(() => {
    document.removeEventListener("keydown", onKeydown);
    clearTimeout(copiedTimer);
    clearTimeout(copyFailedTimer);
    copied.value = false;
    copyFailed.value = false;
});
</script>
