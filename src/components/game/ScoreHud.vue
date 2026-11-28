<template>
  <div class="flex flex-wrap items-center gap-x-4 gap-y-1">
    <span class="font-display text-lg font-black tabular-nums text-amber-400 sm:text-xl">{{ score }}<span class="ml-1 font-sans text-[11px] font-normal text-paper/70">п.</span></span>
    <span class="inline-flex items-center gap-1 text-xs font-bold text-paper/85">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="size-3.5"
        aria-hidden="true"
      >
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
      </svg>
      {{ wrongGuesses }}<span class="sr-only">погрешни обиди</span>
    </span>
    <span class="inline-flex items-center gap-1 text-xs font-bold text-paper/85">
      <span
        class="inline-flex size-4 items-center justify-center rounded-sm border border-paper/50 text-[10px] font-black"
        aria-hidden="true"
      >А</span>
      {{ lettersRevealed }}<span class="sr-only">откриени букви</span>
    </span>
    <span class="rounded-md bg-paper/15 px-1.5 py-0.5 text-xs font-bold text-paper">{{ solvedCount }}/{{ totalBlanks }}</span>
    <span v-if="streak && streak > 0" class="inline-flex items-center gap-1 rounded-md border border-amber-400/60 bg-amber-400/20 px-1.5 py-0.5 text-xs font-bold text-amber-300">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="size-3.5"
        aria-hidden="true"
      >
        <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
      </svg>
      {{ streak }}<span class="sr-only">дневна серија</span>
    </span>
  </div>
</template>

<script setup lang="ts">
defineProps<{
    score: number;
    wrongGuesses: number;
    lettersRevealed: number;
    solvedCount: number;
    totalBlanks: number;
    streak?: number;
}>();
</script>
