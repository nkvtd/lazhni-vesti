<template>
  <h1 class="sr-only">Лажни вести? — Дневен предизвик</h1>
  <div class="flex flex-1 flex-col items-center justify-center gap-6 py-10 text-center">
    <p class="text-xs font-semibold uppercase tracking-[0.25em] text-accent-strong">{{ formatMkDate(data.today) }}</p>

    <!-- Тизер: шаблонот со скриени зборови како точки -->
    <div v-if="data.challenge" class="card max-w-xl p-5">
      <p class="font-display text-xl leading-snug font-black text-ink sm:text-2xl">{{ teaser }}</p>
      <p class="mt-2 text-xs text-ink-soft">Извор: {{ data.challenge.sourceName }} · Број {{ data.challenge.id }}</p>
    </div>
    <div v-else class="card max-w-xl p-6">
      <p class="font-display text-lg font-bold text-ink">Денес нема предизвик</p>
      <p class="mt-1 text-sm text-ink-soft">Уредникот сè уште не го објавил деновниот наслов.</p>
    </div>

    <template v-if="data.challenge && !data.challenge.completed">
      <a href="/play" class="btn btn-primary text-base sm:text-lg px-8 py-3">Играј денешниот предизвик</a>
      <p class="text-xs text-ink-soft">1000 поени на почеток · погоди ги скриените зборови</p>
    </template>
    <template v-else-if="data.challenge?.completed">
      <p class="font-display text-lg font-black text-amber-600">Дел 1 е завршен · {{ data.challenge.score }}/1000</p>
      <div class="flex flex-wrap items-center justify-center gap-3">
        <a href="/debrief" class="btn btn-primary">Продолжи кон дел 2 →</a>
        <a href="/play" class="btn btn-secondary">Прегледај ја играта</a>
      </div>
    </template>

    <!-- Серија / поени -->
    <div v-if="pageContext.user" class="flex items-center gap-2 text-sm">
      <span class="chip border-ink bg-amber-400 text-[#1c1b18]"><span class="font-display">{{ pageContext.user.totalPoints }}</span> п.</span>
      <span v-if="pageContext.user.currentStreak > 0" class="chip border-ink bg-amber-400 text-[#1c1b18]">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3.5" aria-hidden="true"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>
        {{ pageContext.user.currentStreak }} дена
      </span>
    </div>
    <p v-else class="text-xs text-ink-soft">Играј како гостин — напредокот се чува на овој уред. <a href="/signup" class="font-medium text-accent hover:text-accent-strong">Регистрирај се</a> за да го чуваш скорот.</p>

    <nav class="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm font-bold" aria-label="Брзи линкови">
      <a href="/archive" class="text-ink-soft hover:text-ink">Архива</a>
      <a href="/leaderboard" class="text-ink-soft hover:text-ink">Рангирање</a>
      <a v-if="pageContext.user" href="/account" class="text-ink-soft hover:text-ink">Профил</a>
      <a v-else href="/login" class="text-ink-soft hover:text-ink">Најава</a>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { useData } from "vike-vue/useData";
import { usePageContext } from "vike-vue/usePageContext";
import { computed } from "vue";
// biome-ignore lint/correctness/noUnusedImports: used in <template> only
import { formatMkDate } from "../../utils/format";
import type { Data } from "./+data";

const data = useData<Data>();
const pageContext = usePageContext();

const teaser = computed(() =>
    (data.challenge?.templateTitle ?? "").replace(/\{\{\d+\}\}/g, "…"),
);
</script>
