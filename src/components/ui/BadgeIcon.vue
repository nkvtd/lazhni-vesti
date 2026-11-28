<template>
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <component :is="shape.tag" v-for="(shape, i) in shapes" :key="i" v-bind="shape.attrs" />
  </svg>
</template>

<script setup lang="ts">
import { computed } from "vue";

const { icon } = defineProps<{ icon: string }>();

type Shape = {
    tag: "path" | "circle" | "rect";
    attrs: Record<string, string | number>;
};

const BADGE_ICONS: Record<string, Array<string | Shape>> = {
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
    calendar: [
        { tag: "rect", attrs: { width: 18, height: 18, x: 3, y: 4, rx: 2 } },
        "M8 2v4",
        "M16 2v4",
        "M3 10h18",
    ],
    check: ["M20 6 9 17l-5-5"],
    shield: [
        "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1 1 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",
    ],
    medal: [
        "M7.21 15 2.66 7.14a2 2 0 0 1 .13-2.2L4.4 2.8A2 2 0 0 1 6 2h12a2 2 0 0 1 1.6.8l1.6 2.14a2 2 0 0 1 .14 2.2L16.79 15",
        "M11 12 5.12 2.2",
        "m13 12 5.88-9.8",
        "M8 7h8",
        "M12 18v-2h-.5",
        { tag: "circle", attrs: { cx: 12, cy: 17, r: 5 } },
    ],
};

const shapes = computed(() =>
    (BADGE_ICONS[icon] ?? BADGE_ICONS.trophy).map((part) =>
        typeof part === "string"
            ? { tag: "path" as const, attrs: { d: part } }
            : part,
    ),
);
</script>
