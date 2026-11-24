<template>
  <div class="flex flex-1 items-center justify-center py-4">
    <div class="w-full max-w-xl sm:max-w-2xl lg:max-w-3xl">
      <a href="/archive" class="text-sm text-ink-soft hover:text-ink">← Архива</a>
      <h1 class="mt-2 font-display text-2xl font-black tracking-tight text-ink sm:text-3xl">Предизвик од {{ formatMkDate(data.challenge.playDate) }}</h1>
      <GamePlay class="mt-6" :initial-challenge="data.challenge" is-archive />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useData } from "vike-vue/useData";
// biome-ignore lint/correctness/noUnusedImports: used in <template> only
import GamePlay from "../../../components/game/GamePlay.vue";
// biome-ignore lint/correctness/noUnusedImports: used in <template> only
import { formatMkDate } from "../../../utils/format";
import type { Data } from "./+data";

const data = useData<Data>();
</script>
