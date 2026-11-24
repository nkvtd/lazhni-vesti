<template>
  <h1 class="font-display text-3xl font-black tracking-tight text-ink">Админ</h1>
  <p class="mt-1 text-sm text-ink-soft">Редакција на вести и закажување предизвици · {{ formatMkDate(data.today) }}</p>

  <p v-if="pageError" role="alert" class="mt-4 text-sm font-medium text-wrong">{{ pageError }}</p>
  <p v-if="scrapeNotice" class="mt-4 text-sm text-accent-strong">{{ scrapeNotice }}</p>

  <section class="mt-6">
    <div class="flex flex-wrap items-center justify-between gap-3 border-b-2 border-ink pb-2">
      <h2 class="font-display text-xl font-bold">Ред за објава</h2>
      <div class="flex flex-wrap items-center gap-2">
        <button type="button" class="btn btn-secondary btn-sm" :disabled="scrapeBusy" @click="scrape">Повлечи вести</button>
        <button type="button" class="btn btn-primary btn-sm" @click="openEditor(null)">Нова вест</button>
      </div>
    </div>

    <input
      v-model="searchQuery"
      type="search"
      class="input mt-3"
      placeholder="Пребарај по наслов, извор или клучен збор…"
      aria-label="Пребарај вести"
    />

    <ul v-if="staged.length" class="mt-4 divide-y divide-ink/10 rounded-lg border border-ink/10 bg-card shadow-sm">
      <StagedArticleRow
        v-for="a in staged"
        :key="a.id"
        :article="a"
        :busy="actionBusy"
        @edit="openEditor(a)"
        @delete="onRowDelete(a)"
      />
    </ul>
    <p v-else class="card mt-4 p-6 text-center text-sm text-ink-soft">
      Нема вести во редот. Повлечете вести или додадете нови рачно.
    </p>
  </section>

  <section class="mt-10">
    <h2 class="border-b-2 border-ink pb-1 font-display text-xl font-bold">Закажани и објавени предизвици</h2>
    <p v-if="!upcoming.length" class="mt-4 text-sm text-ink-soft">Сè уште нема закажани предизвици.</p>
    <ul v-else class="mt-4 divide-y divide-ink/10 rounded-lg border border-ink/10 bg-card shadow-sm">
      <li v-for="c in upcoming" :key="c.id" class="flex items-center justify-between gap-3 px-4 py-3">
        <span class="min-w-0">
          <span class="block text-sm font-medium text-ink">{{ formatMkDate(c.playDate) }} · {{ c.sourceName }}</span>
          <span class="block truncate text-xs text-ink-soft">{{ c.originalTitle }}</span>
        </span>
        <span class="chip shrink-0">{{ c.blanks.length }} збора</span>
      </li>
    </ul>
  </section>

  <ChallengeEditorModal
    :article="editorArticle"
    :today="data.today"
    :open="editorOpen"
    @close="editorOpen = false"
    @saved="onEditorSaved"
    @published="onEditorPublished"
  />
</template>

<script setup lang="ts">
import { useData } from "vike-vue/useData";
import { onBeforeUnmount, ref, watch } from "vue";
// biome-ignore lint/correctness/noUnusedImports: used in <template> only
import ChallengeEditorModal from "../../components/admin/ChallengeEditorModal.vue";
// biome-ignore lint/correctness/noUnusedImports: used in <template> only
import StagedArticleRow from "../../components/admin/StagedArticleRow.vue";
import { errMessage } from "../../utils/error";
// biome-ignore lint/correctness/noUnusedImports: used in <template> only
import { formatMkDate } from "../../utils/format";
import type { Data } from "./+data";
import {
    onDeleteStagedArticle,
    onSearchStagedArticles,
    onTriggerScrape,
} from "./Admin.telefunc";

type Staged = Data["stagedArticles"][number];
type Upcoming = Data["upcomingChallenges"][number];

const data = useData<Data>();
const staged = ref<Staged[]>(data.stagedArticles);
const upcoming = ref<Upcoming[]>(data.upcomingChallenges);
const searchQuery = ref("");
const pageError = ref<string | null>(null);
const scrapeBusy = ref(false);
const actionBusy = ref(false);
const scrapeNotice = ref<string | null>(null);
const editorOpen = ref(false);
const editorArticle = ref<Staged | null>(null);

let searchTimer: ReturnType<typeof setTimeout> | undefined;
let noticeTimer: ReturnType<typeof setTimeout> | undefined;

async function runSearch() {
    pageError.value = null;
    try {
        staged.value = await onSearchStagedArticles(searchQuery.value);
    } catch (e) {
        pageError.value = errMessage(e);
    }
}

watch(searchQuery, () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(runSearch, 300);
});

async function scrape() {
    pageError.value = null;
    scrapeBusy.value = true;
    try {
        const { inserted } = await onTriggerScrape();
        scrapeNotice.value =
            inserted > 0
                ? `Повлекувани нови вести: ${inserted}`
                : "Нема нови вести.";
        clearTimeout(noticeTimer);
        noticeTimer = setTimeout(() => {
            scrapeNotice.value = null;
        }, 5000);
        staged.value = await onSearchStagedArticles(searchQuery.value);
    } catch (e) {
        pageError.value = errMessage(e);
    } finally {
        scrapeBusy.value = false;
    }
}

async function onRowDelete(article: Staged) {
    pageError.value = null;
    actionBusy.value = true;
    try {
        await onDeleteStagedArticle(article.id);
        staged.value = staged.value.filter((a) => a.id !== article.id);
    } catch (e) {
        pageError.value = errMessage(e);
    } finally {
        actionBusy.value = false;
    }
}

function openEditor(article: Staged | null) {
    editorArticle.value = article;
    editorOpen.value = true;
}

function onEditorSaved(updated: Staged) {
    if (staged.value.some((a) => a.id === updated.id)) {
        staged.value = staged.value.map((a) =>
            a.id === updated.id ? updated : a,
        );
    } else {
        staged.value = [updated, ...staged.value];
    }
}

function onEditorPublished(challenge: Upcoming) {
    upcoming.value = [...upcoming.value, challenge].sort((a, b) =>
        a.playDate.localeCompare(b.playDate),
    );
    if (challenge.stagedArticleId != null) {
        staged.value = staged.value.filter(
            (a) => a.id !== challenge.stagedArticleId,
        );
    }
}

onBeforeUnmount(() => {
    clearTimeout(searchTimer);
    clearTimeout(noticeTimer);
});
</script>
