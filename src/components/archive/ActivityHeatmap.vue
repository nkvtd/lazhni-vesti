<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import type { Data } from "../../pages/archive/index/+data";
import { formatMkDate } from "../../utils/format";

type Item = Data["items"][number];

const props = defineProps<{
    items: Array<
        Pick<
            Item,
            | "playDate"
            | "completed"
            | "score"
            | "isFreePlay"
            | "usedTimeMachine"
        >
    >;
    today: string;
}>();

const MONTHS_SHORT = [
    "јан",
    "фев",
    "мар",
    "апр",
    "мај",
    "јун",
    "јул",
    "авг",
    "сеп",
    "окт",
    "ное",
    "дек",
] as const;

function toUtc(dateStr: string): Date {
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d));
}

function addDays(dateStr: string, n: number): string {
    const d = toUtc(dateStr);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
}

function isoDow(dateStr: string): number {
    return (toUtc(dateStr).getUTCDay() + 6) % 7; // 0 = Monday
}

const byDate = computed(() => new Map(props.items.map((i) => [i.playDate, i])));

// grid start: 52 weeks back, aligned back to Monday
const startDate = computed(() => {
    let s = addDays(props.today, -52 * 7);
    const dow = isoDow(s);
    if (dow !== 0) s = addDays(s, -dow);
    return s;
});

const weeks = computed(() => {
    const cols: Array<Array<string | null>> = [];
    let cursor = startDate.value;
    while (cursor <= props.today) {
        const week: Array<string | null> = [];
        for (let r = 0; r < 7; r++) {
            week.push(cursor <= props.today ? cursor : null);
            cursor = addDays(cursor, 1);
        }
        cols.push(week);
    }
    return cols;
});

const monthLabels = computed(() => {
    const labels: Array<{ col: number; text: string }> = [];
    let prevMonth = -1;
    weeks.value.forEach((week, col) => {
        for (const d of week) {
            if (!d) continue;
            const m = Number(d.slice(5, 7));
            if (m !== prevMonth) {
                labels.push({ col, text: MONTHS_SHORT[m - 1] });
                prevMonth = m;
                break;
            }
        }
    });
    return labels;
});

type DayStatus = "none" | "unsolved" | "free" | "ontime" | "tm" | "lost";

type HeatItem = Item | undefined;

function statusOf(item: HeatItem): DayStatus {
    if (!item) return "none";
    if (item.completed && (item.score ?? 0) > 0) {
        if (item.usedTimeMachine) return "tm";
        if (item.isFreePlay) return "free";
        return "ontime";
    }
    if (item.completed) return "lost";
    return "unsolved";
}

function colorClass(item: HeatItem): string {
    switch (statusOf(item)) {
        case "ontime":
            return "bg-accent";
        case "tm":
            return "bg-amber-400";
        case "free":
            return "bg-accent-soft";
        case "lost":
            return "bg-wrong/40";
        case "unsolved":
            return "bg-ink/20";
        default:
            return "bg-ink/[0.04]";
    }
}

function tipOf(item: HeatItem): string {
    if (!item) return "Нема објавен предизвик";
    const date = formatMkDate(item.playDate);
    switch (statusOf(item)) {
        case "tm":
            return `${date} — Решено со Time Machine · ${item.score} п.`;
        case "ontime":
            return `${date} — Решено · ${item.score} п.`;
        case "free":
            return `${date} — Решено (слободна игра) · ${item.score} п.`;
        case "lost":
            return `${date} — Играно, не е решено`;
        case "unsolved":
            return `${date} — Објавено, неиграно`;
        default:
            return date;
    }
}

const scrollEl = ref<HTMLDivElement | null>(null);

onMounted(() => {
    const el = scrollEl.value;
    if (el) el.scrollLeft = el.scrollWidth; // land on the latest weeks on mobile
});
</script>

<template>
  <div>
    <div ref="scrollEl" class="overflow-x-auto pb-1">
      <div class="flex items-start gap-1.5" style="width: max-content">
        <!-- weekday labels: grid aligned to the 7 day-rows -->
        <div class="grid gap-[2px] pt-4 text-[9px] leading-[11px] text-ink-soft" style="grid-template-rows: repeat(7, 11px)" aria-hidden="true">
          <span>пон</span><span /><span>сре</span><span /><span>пет</span><span /><span />
        </div>
        <div>
          <!-- month labels row -->
          <div class="relative mb-1 h-3 text-[9px] text-ink-soft" :style="{ width: `${weeks.length * 13}px` }">
            <span v-for="label in monthLabels" :key="label.col" class="absolute" :style="{ left: `${label.col * 13}px` }">{{ label.text }}</span>
          </div>
          <!-- day grid: auto-flow column fills column-by-column (Mon..Sun rows) -->
          <div class="grid gap-[2px]" :style="{ gridTemplateRows: 'repeat(7, 11px)', gridAutoFlow: 'column', gridAutoColumns: '11px' }">
            <template v-for="(week, ci) in weeks" :key="ci">
              <template v-for="(day, ri) in week" :key="`${ci}-${ri}`">
                <a v-if="day && byDate.get(day)" :href="`/archive/${day}`" class="size-[11px] rounded-[3px] transition-colors hover:opacity-80" :class="colorClass(byDate.get(day))" :title="tipOf(byDate.get(day))" :aria-label="tipOf(byDate.get(day))" />
                <span v-else-if="day" class="size-[11px] rounded-[3px] bg-ink/[0.04]" :title="tipOf(byDate.get(day))" />
                <span v-else class="size-[11px]" />
              </template>
            </template>
          </div>
        </div>
      </div>
    </div>
    <!-- legend, bottom-right -->
    <div class="mt-3 flex flex-wrap justify-end gap-x-3 gap-y-1 text-[10px] text-ink-soft">
      <span class="inline-flex items-center gap-1"><span class="inline-block size-[10px] rounded-[2px] bg-accent" aria-hidden="true" />Решено</span>
      <span class="inline-flex items-center gap-1"><span class="inline-block size-[10px] rounded-[2px] bg-amber-400" aria-hidden="true" />Time Machine</span>
      <span class="inline-flex items-center gap-1"><span class="inline-block size-[10px] rounded-[2px] bg-accent-soft" aria-hidden="true" />Слободна игра</span>
      <span class="inline-flex items-center gap-1"><span class="inline-block size-[10px] rounded-[2px] bg-ink/20" aria-hidden="true" />Неиграно</span>
      <span class="inline-flex items-center gap-1"><span class="inline-block size-[10px] rounded-[2px] bg-wrong/40" aria-hidden="true" />Не е решено</span>
      <span class="inline-flex items-center gap-1"><span class="inline-block size-[10px] rounded-[2px] bg-ink/[0.04]" aria-hidden="true" />Нема предизвик</span>
    </div>
  </div>
</template>
