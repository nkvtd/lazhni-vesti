<template>
  <div
    v-if="visible"
    class="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-5 bg-paper transition-opacity duration-300"
    :class="{ 'pointer-events-none opacity-0': fading }"
    role="status"
    aria-label="Се вчитува играта…"
    :aria-hidden="fading ? 'true' : undefined"
  >
    <div class="font-display font-black text-4xl sm:text-5xl tracking-tight text-ink">
      <span
        v-for="(char, i) in WORDMARK"
        :key="i"
        class="inline-block animate-letter-in"
        :class="char === '?' ? 'text-accent' : ''"
        :style="{ animationDelay: `${i * 60}ms` }"
        aria-hidden="true"
        >{{ char === " " ? "\u00A0" : char }}</span
      >
    </div>
    <p class="text-sm font-bold uppercase tracking-[0.3em] text-ink-soft" aria-hidden="true">
      проверуваме факт<span class="animate-pulse">.</span><span class="animate-pulse" style="animation-delay: 200ms">.</span><span class="animate-pulse" style="animation-delay: 400ms">.</span>
    </p>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";

const WORDMARK = "ЛАЖНИ ВЕСТИ?";

const visible = ref(false);
const fading = ref(false);

let hideTimer: ReturnType<typeof setTimeout> | undefined;
let fadeTimer: ReturnType<typeof setTimeout> | undefined;

onMounted(() => {
    visible.value = true;
    hideTimer = setTimeout(() => {
        fading.value = true;
        fadeTimer = setTimeout(() => (visible.value = false), 300);
    }, 1400);
});

onBeforeUnmount(() => {
    clearTimeout(hideTimer);
    clearTimeout(fadeTimer);
});
</script>
