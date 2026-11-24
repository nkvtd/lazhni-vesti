<template>
  <div class="mx-auto w-full max-w-3xl">
  <h1 class="font-display text-3xl font-black tracking-tight text-ink">Рангирање</h1>
  <p class="mt-1 text-sm text-ink-soft">Денешен предизвик · {{ formatMkDate(data.today) }}</p>

  <div class="mt-6 inline-flex rounded-lg border-2 border-ink bg-card p-1 shadow-hard-sm" role="tablist" aria-label="Табови за рангирање">
    <button
      type="button"
      role="tab"
      :aria-selected="activeTab === 'daily'"
      class="rounded-md border-2 px-4 py-1.5 text-sm font-bold"
      :class="activeTab === 'daily' ? 'border-ink bg-ink text-paper' : 'border-transparent text-ink-soft hover:text-ink'"
      @click="activeTab = 'daily'"
    >
      Денес
    </button>
    <button
      type="button"
      role="tab"
      :aria-selected="activeTab === 'allTime'"
      class="rounded-md border-2 px-4 py-1.5 text-sm font-bold"
      :class="activeTab === 'allTime' ? 'border-ink bg-ink text-paper' : 'border-transparent text-ink-soft hover:text-ink'"
      @click="activeTab = 'allTime'"
    >
      Севкупно
    </button>
  </div>

  <div v-show="activeTab === 'daily'" role="tabpanel" aria-label="Денес">
    <p v-if="!data.daily.length" class="mt-4 text-sm text-ink-soft">Денес сè уште нема завршени предизвици.</p>
    <template v-else>
      <ol class="mt-4 divide-y-2 divide-ink/10 rounded-xl border-2 border-ink bg-card shadow-hard">
        <li
          v-for="(row, index) in data.daily"
          :key="row.userId"
          class="flex items-center justify-between gap-3 px-4 py-3"
          :class="row.userId === pageContext.user?.id ? 'bg-accent-soft/70' : ''"
        >
          <span class="flex min-w-0 items-center gap-2.5">
            <span class="flex size-6 shrink-0 items-center justify-center rounded-md text-xs font-bold" :class="rankClass(index)">{{ index + 1 }}</span>
            <span class="truncate text-sm font-bold text-ink">{{ row.username }}</span>
            <span v-if="row.userId === pageContext.user?.id" class="chip shrink-0 border-ink bg-accent text-white">Вие</span>
            <span
              v-for="b in row.badges"
              :key="b.name"
              class="inline-flex size-5 shrink-0 items-center justify-center rounded-full border border-ink/25 bg-amber-100 text-amber-700"
              :title="b.name"
              :aria-label="b.name"
            >
              <BadgeIcon :icon="b.icon" class="size-3" />
            </span>
          </span>
          <span class="flex shrink-0 items-center gap-2 text-xs text-ink-soft">
            <span class="chip border-ink bg-amber-400 font-bold text-ink"><span class="font-display tabular-nums">{{ row.score }}</span> п.</span>
            <span class="hidden sm:inline">{{ row.wrongGuessesCount }} грешки · {{ row.hintsUsedCount }} хинтови</span>
          </span>
        </li>
      </ol>
      <p class="mt-2 text-xs text-ink-soft">Поени само од дневниот предизвик, без слободни игри.</p>
    </template>
  </div>

  <div v-show="activeTab === 'allTime'" role="tabpanel" aria-label="Севкупно">
    <p v-if="!data.allTime.length" class="mt-4 text-sm text-ink-soft">Сè уште нема регистрирани играчи.</p>
    <ol v-else class="mt-4 divide-y-2 divide-ink/10 rounded-xl border-2 border-ink bg-card shadow-hard">
      <li
        v-for="(row, index) in data.allTime"
        :key="row.userId"
        class="flex items-center justify-between gap-3 px-4 py-3"
        :class="row.userId === pageContext.user?.id ? 'bg-accent-soft/70' : ''"
      >
        <span class="flex min-w-0 items-center gap-2.5">
          <span class="flex size-6 shrink-0 items-center justify-center rounded-md text-xs font-bold" :class="rankClass(index)">{{ index + 1 }}</span>
          <span class="truncate text-sm font-bold text-ink">{{ row.username }}</span>
          <span v-if="row.userId === pageContext.user?.id" class="chip shrink-0 border-ink bg-accent text-white">Вие</span>
          <span
            v-for="b in row.badges"
            :key="b.name"
            class="inline-flex size-5 shrink-0 items-center justify-center rounded-full border border-ink/25 bg-amber-100 text-amber-700"
            :title="b.name"
            :aria-label="b.name"
          >
            <BadgeIcon :icon="b.icon" class="size-3" />
          </span>
        </span>
        <span class="flex shrink-0 items-center gap-2">
          <span class="chip border-ink bg-amber-400 font-bold text-ink"><span class="font-display tabular-nums">{{ row.totalPoints }}</span> п.</span>
          <span v-if="row.currentStreak > 0" class="chip text-amber-600">
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
            <span class="sr-only">серија</span>
            {{ row.currentStreak }}
          </span>
        </span>
      </li>
    </ol>
  </div>
  </div>
</template>

<script setup lang="ts">
import { useData } from "vike-vue/useData";
import { usePageContext } from "vike-vue/usePageContext";
import { ref } from "vue";
// biome-ignore lint/correctness/noUnusedImports: used in <template> only
import BadgeIcon from "../../components/ui/BadgeIcon.vue";
// biome-ignore lint/correctness/noUnusedImports: used in <template> only
import { formatMkDate } from "../../utils/format";
import type { Data } from "./+data";

const data = useData<Data>();
const pageContext = usePageContext();
const activeTab = ref<"daily" | "allTime">("daily");

function rankClass(index: number): string {
    if (index === 0)
        return "border-2 border-ink bg-amber-400 text-ink shadow-hard-sm";
    if (index === 1)
        return "border-2 border-ink bg-ink/10 text-ink shadow-hard-sm";
    if (index === 2)
        return "border-2 border-ink bg-orange-300 text-ink shadow-hard-sm";
    return "border-transparent text-ink-soft";
}
</script>
