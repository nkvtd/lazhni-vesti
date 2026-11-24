<template>
  <div>
    <div class="flex flex-wrap items-baseline justify-between gap-2 border-b-2 border-ink pb-2">
      <span class="text-xs font-semibold uppercase tracking-[0.15em] text-ink">{{ challenge.sourceName }}</span>
      <span class="flex items-center gap-2 text-xs text-ink-soft">
        <span class="chip">Број {{ challenge.id }}</span>
        {{ formatMkDate(challenge.playDate) }}
      </span>
    </div>

    <h2 class="mt-4 font-display text-2xl leading-[2.1] font-black text-ink sm:text-[2rem] lg:text-4xl">
      <template v-for="(item, i) in renderList" :key="i">
        <span v-if="!item.isBlank">{{ item.text }}</span>
        <WordBlankSlot
          v-else-if="item.blank"
          :blank="item.blank"
          :disabled="busy"
          @guess="(word) => $emit('guess', item.blankIndex!, word)"
          @focus="(i) => $emit('focus', i)"
        />
      </template>
    </h2>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { ClientChallenge } from "../../composables/useGameSession";
import { formatMkDate } from "../../utils/format";
import WordBlankSlot from "./WordBlankSlot.vue";

const props = defineProps<{
    challenge: ClientChallenge;
    segments: Array<{ isBlank: boolean; text?: string; blankIndex?: number }>;
    busy: boolean;
}>();

defineEmits<{
    guess: [blankIndex: number, word: string];
    focus: [blankIndex: number];
}>();

const renderList = computed(() =>
    props.segments.map((seg) => ({
        ...seg,
        blank: seg.isBlank
            ? props.challenge.blanks.find((b) => b.index === seg.blankIndex)
            : undefined,
    })),
);
</script>
