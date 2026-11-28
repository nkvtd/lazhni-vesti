<template>
  <div class="flex flex-1 items-start justify-center py-4">
    <BehindTheHeadline :challenge="data.challenge" :is-archive="false" />
  </div>
</template>

<script setup lang="ts">
import { useData } from "vike-vue/useData";
// biome-ignore lint/correctness/noUnusedImports: used in <template> only
import BehindTheHeadline from "../../components/game/BehindTheHeadline.vue";
import type { Data } from "./+data";

const data = useData<Data>();
</script>
