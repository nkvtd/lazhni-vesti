<template>
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <rect v-if="icon === 'calendar'" width="18" height="18" x="3" y="4" rx="2" />
    <path v-for="d in paths" :key="d" :d="d" />
  </svg>
</template>

<script setup lang="ts">
import { computed } from "vue";

const { icon } = defineProps<{ icon: string }>();

const BADGE_ICONS: Record<string, string[]> = {
    fire: [
        "M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z",
    ],
    trophy: [
        "M6 9H4.5a2.5 2.5 0 0 1 0-5H6",
        "M18 9h1.5a2.5 2.5 0 0 0 0-5H18",
        "M4 22h16",
        "M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22",
        "M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22",
        "M18 2H6v7a6 6 0 0 0 12 0V2Z",
    ],
    crown: [
        "M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.735H5.81a1 1 0 0 1-.957-.735L2.02 6.02a.5.5 0 0 1 .798-.52l3.276 3.066a1 1 0 0 0 1.516-.294z",
        "M5 21h14",
    ],
    calendar: ["M8 2v4", "M16 2v4", "M3 10h18"],
};

const paths = computed(() => BADGE_ICONS[icon] ?? BADGE_ICONS.trophy);
</script>
