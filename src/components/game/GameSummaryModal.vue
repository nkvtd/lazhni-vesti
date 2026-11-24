<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" @click.self="$emit('close')">
    <div role="dialog" aria-modal="true" aria-labelledby="game-summary-title" class="card my-8 w-full max-w-sm overflow-hidden">
      <div class="border-b-2 border-ink px-6 py-4 text-center" :class="won ? 'bg-accent text-white' : 'bg-ink text-paper'">
        <h2 id="game-summary-title" class="font-display text-2xl font-black">
          {{ won ? "Го погодивте насловот!" : isArchive ? "Крај на архивскиот предизвик" : "Крај на дневниот предизвик" }}
        </h2>
        <p class="mt-1 font-display text-4xl font-black tabular-nums" :class="won ? 'text-amber-300' : 'text-amber-400'">{{ score }}<span class="ml-1 font-sans text-sm font-normal opacity-80">/1000</span></p>
      </div>

      <div class="p-6">
        <dl class="space-y-1.5 text-sm">
          <div class="flex items-center justify-between">
            <dt class="text-ink-soft">Почетни поени</dt>
            <dd class="font-semibold tabular-nums">1000</dd>
          </div>
          <div class="flex items-center justify-between">
            <dt class="text-ink-soft">Погрешни обиди (−50)</dt>
            <dd class="font-semibold tabular-nums" :class="wrongGuesses > 0 ? 'text-wrong' : ''">−{{ wrongGuesses * 50 }}</dd>
          </div>
          <div class="flex items-center justify-between">
            <dt class="text-ink-soft">Хинтови (−250)</dt>
            <dd class="font-semibold tabular-nums" :class="hintsUsed > 0 ? 'text-amber-600' : ''">−{{ hintsUsed * 250 }}</dd>
          </div>
          <div class="flex items-center justify-between border-t border-ink/10 pt-1.5">
            <dt class="font-bold">Вкупно</dt>
            <dd class="font-display font-black tabular-nums">{{ score }}</dd>
          </div>
          <div v-if="tmActive && won" class="flex items-center justify-between border-t border-ink/10 pt-1.5">
            <dt class="font-semibold text-ink">Time Machine трошок</dt>
            <dd class="font-semibold tabular-nums text-wrong">−1500</dd>
          </div>
        </dl>

        <template v-if="originalTitle">
          <p class="label mt-4">Вистинскиот наслов</p>
          <p class="font-display text-lg font-bold text-ink">{{ originalTitle }}</p>
        </template>

        <a
          v-if="sourceUrl"
          :href="sourceUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="mt-2 inline-flex items-center gap-1 text-sm font-medium text-accent hover:text-accent-strong"
        >
          Извор: {{ sourceName }}
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

        <button ref="closeBtn" type="button" class="btn btn-secondary mt-2 w-full" @click="$emit('close')">Затвори</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import { formatMkDate } from "../../utils/format";

const {
    score,
    playDate,
    isArchive = false,
    tmActive = false,
} = defineProps<{
    originalTitle?: string;
    sourceName: string;
    sourceUrl?: string;
    score: number;
    won: boolean;
    playDate: string;
    wrongGuesses: number;
    hintsUsed: number;
    isArchive?: boolean;
    tmActive?: boolean;
}>();

const emit = defineEmits<{
    close: [];
}>();

const closeBtn = ref<HTMLButtonElement | null>(null);
const copied = ref(false);
let copiedTimer: ReturnType<typeof setTimeout> | undefined;

async function copyResult() {
    const text = `Лажни вести? · ${formatMkDate(playDate)} · ${score}/1000 поени`;
    try {
        await navigator.clipboard.writeText(text);
        copied.value = true;
        clearTimeout(copiedTimer);
        copiedTimer = setTimeout(() => (copied.value = false), 2500);
    } catch {
        /* clipboard unavailable — keep button in default state */
    }
}

function onKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") emit("close");
}

onMounted(async () => {
    document.addEventListener("keydown", onKeydown);
    await nextTick();
    closeBtn.value?.focus();
});

onBeforeUnmount(() => {
    document.removeEventListener("keydown", onKeydown);
    clearTimeout(copiedTimer);
    copied.value = false;
});
</script>
