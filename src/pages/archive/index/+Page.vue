<template>
  <div class="mx-auto w-full max-w-3xl">
  <h1 class="font-display text-3xl font-black tracking-tight text-ink">Архива</h1>
  <p class="mt-1 text-sm text-ink-soft">Изминати предизвици — играте за забава или со Time Machine.</p>

  <div v-if="data.items.length === 0" class="card mt-6 p-8 text-center text-sm font-bold text-ink-soft">
    Сè уште нема архивирани предизвици.
  </div>

  <ul v-else class="mt-6 divide-y-2 divide-ink/10 rounded-xl border-2 border-ink bg-card shadow-hard">
    <li v-for="item in data.items" :key="item.id">
      <a :href="`/archive/${item.playDate}`" class="flex items-center justify-between gap-3 px-4 py-3 hover:bg-accent-soft/50">
        <span class="min-w-0">
          <span class="block text-sm font-bold text-ink">{{ formatMkDate(item.playDate) }}</span>
          <span class="block truncate text-xs text-ink-soft">{{ item.sourceName }} · {{ item.blanksCount }} збора</span>
        </span>
        <span v-if="item.completed" class="chip shrink-0 border-ink bg-accent text-white shadow-hard-sm">Решено · {{ item.score }} п.</span>
        <span v-else-if="item.canUseTimeMachine" class="chip shrink-0 border-ink bg-amber-400 text-ink shadow-hard-sm">Time Machine</span>
        <span v-else class="chip shrink-0">Неиграно</span>
      </a>
    </li>
  </ul>
  </div>
</template>

<script setup lang="ts">
import { useData } from "vike-vue/useData";
// biome-ignore lint/correctness/noUnusedImports: used in <template> only
import { formatMkDate } from "../../../utils/format";
import type { Data } from "./+data";

const data = useData<Data>();
</script>
