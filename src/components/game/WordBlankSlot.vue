<template>
  <template v-if="blank.solved || blank.revealedAnswer">
    <sup class="mr-0.5 align-super text-[10px] font-bold text-accent-strong" aria-hidden="true">{{ blank.index + 1 }}</sup>
    <span
      class="mx-0.5 inline-flex items-center rounded-md border-2 border-ink bg-accent px-2.5 py-0.5 font-bold text-white shadow-hard-sm"
      :class="popping ? 'animate-pop' : ''"
      :aria-label="`Збор ${blank.index + 1}, решен`"
    >{{ blank.revealedAnswer }}</span>
  </template>
  <template v-else>
    <sup class="mr-0.5 align-super text-[10px] font-bold text-accent-strong" aria-hidden="true">{{ blank.index + 1 }}</sup>
    <input
      v-model="value"
      type="text"
      autocomplete="off"
      spellcheck="false"
      :disabled="disabled"
      :aria-label="`Збор ${blank.index + 1}`"
      :data-blank-index="blank.index"
      class="mx-0.5 w-28 rounded-md border-2 border-ink bg-card px-1.5 py-0.5 text-center font-bold text-ink shadow-hard-sm transition-all focus:border-accent focus:bg-accent-soft focus:shadow-hard focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent/60 sm:w-36 lg:w-44"
      :class="shaking ? 'animate-shake border-wrong bg-wrong/10 shadow-none' : ''"
      @keydown.enter.prevent="emit('guess', value.trim())"
      @focus="emit('focus', blank.index)"
    />
    <span v-if="blank.wrongAttempts > 0" class="text-xs font-semibold text-wrong" :aria-label="`${blank.wrongAttempts} погрешни обиди`">×{{ blank.wrongAttempts }}</span>
    <span v-if="blank.hintUsed" class="text-xs font-bold text-amber-600" title="Хинт отклучен" aria-hidden="true">?</span>
  </template>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from "vue";
import type { ClientChallenge } from "../../composables/useGameSession";

const { blank, disabled } = defineProps<{
    blank: ClientChallenge["blanks"][number];
    disabled: boolean;
}>();

const emit = defineEmits<{
    guess: [word: string];
    focus: [blankIndex: number];
}>();

const value = ref("");
const shaking = ref(false);
const popping = ref(false);
let shakeTimer: ReturnType<typeof setTimeout> | undefined;
let popTimer: ReturnType<typeof setTimeout> | undefined;

watch(
    () => blank.wrongAttempts,
    () => {
        if (!blank.solved) {
            value.value = "";
            shaking.value = true;
            clearTimeout(shakeTimer);
            shakeTimer = setTimeout(() => (shaking.value = false), 500);
        }
    },
);

watch(
    () => blank.solved,
    (solved, was) => {
        value.value = "";
        if (solved && !was) {
            popping.value = true;
            clearTimeout(popTimer);
            popTimer = setTimeout(() => (popping.value = false), 400);
        }
    },
);

onBeforeUnmount(() => {
    clearTimeout(shakeTimer);
    clearTimeout(popTimer);
});
</script>
