<template>
  <div v-if="open" class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/40 p-4" @click.self="emit('close')">
    <div role="dialog" aria-modal="true" aria-labelledby="challenge-editor-title" class="card my-8 w-full max-w-2xl p-5 sm:p-6">
      <h2 id="challenge-editor-title" class="font-display text-xl font-bold">{{ article ? "Уреди вест" : "Нова вест" }}</h2>

      <form class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2" @submit.prevent>
        <p class="text-xs font-semibold uppercase tracking-[0.15em] text-ink-soft sm:col-span-2">Наслов и извор</p>
        <div class="sm:col-span-2">
          <label class="label" for="editor-original-title">Оригинален наслов</label>
          <input id="editor-original-title" ref="firstField" v-model="originalTitle" class="input" />
        </div>
        <div>
          <label class="label" for="editor-source-name">Извор</label>
          <input id="editor-source-name" v-model="sourceName" class="input" />
        </div>
        <div>
          <label class="label" for="editor-source-url">Линк до изворот</label>
          <input id="editor-source-url" v-model="sourceUrl" class="input" type="url" />
        </div>

        <p class="mt-2 text-xs font-semibold uppercase tracking-[0.15em] text-ink-soft sm:col-span-2">Шаблон и зборови</p>
        <div class="sm:col-span-2">
          <label class="label" for="editor-template">Шаблон на наслов</label>
          <input id="editor-template" v-model="templateTitle" class="input" aria-label="Шаблон на наслов" />
          <p v-pre class="mt-1 text-xs text-ink-soft">Користете {{0}}, {{1}} … за празни места.</p>
        </div>

        <div class="sm:col-span-2">
          <div class="label">Зборови</div>
          <div v-for="(blank, i) in blanks" :key="i" class="mb-2 flex flex-wrap items-center gap-2">
            <span class="text-xs font-semibold text-ink-soft">Збор {{ i + 1 }}</span>
            <input v-model="blank.answer" class="input max-w-[10rem]" :aria-label="`Одговор збор ${i + 1}`" />
            <input v-model="blank.hint" class="input flex-1 min-w-[12rem]" :aria-label="`Хинт збор ${i + 1}`" />
            <button
              type="button"
              class="btn btn-danger btn-sm"
              :disabled="blanks.length <= 1"
              :aria-label="`Избриши збор ${i + 1}`"
              @click="removeBlank(i)"
            >
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
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>
          <button type="button" class="btn btn-secondary btn-sm mt-1" @click="addBlank">Додади збор</button>
        </div>

        <p class="mt-2 text-xs font-semibold uppercase tracking-[0.15em] text-ink-soft sm:col-span-2">Објава</p>
        <div>
          <label class="label" for="editor-play-date">Датум за објава</label>
          <input id="editor-play-date" v-model="playDate" class="input" type="date" :min="today" />
        </div>

        <p v-if="error" role="alert" class="text-sm font-medium text-wrong sm:col-span-2">{{ error }}</p>
      </form>

      <div class="mt-5 flex flex-wrap items-center gap-2">
        <button type="button" class="btn btn-secondary" :disabled="anyBusy" @click="generateAi">Генерирај AI шаблон</button>
        <span class="flex-1" />
        <button type="button" class="btn btn-secondary" :disabled="anyBusy" @click="save">Зачувај</button>
        <button type="button" class="btn btn-primary" :disabled="anyBusy" @click="publish">Објави предизвик</button>
        <button type="button" class="btn btn-secondary" @click="emit('close')">Откажи</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
    computed,
    nextTick,
    onBeforeUnmount,
    onMounted,
    ref,
    watch,
} from "vue";
import type { Data as AdminData } from "../../pages/admin/+data";
import {
    onCreateStagedArticle,
    onGenerateAiProposal,
    onPublishChallenge,
    onUpdateStagedArticle,
} from "../../pages/admin/Admin.telefunc";
import { errMessage } from "../../utils/error";

type Staged = AdminData["stagedArticles"][number];
type Upcoming = AdminData["upcomingChallenges"][number];

const props = defineProps<{
    article: Staged | null;
    today: string;
    open: boolean;
}>();

const emit = defineEmits<{
    close: [];
    saved: [article: Staged];
    published: [challenge: Upcoming];
}>();

type BlankDraft = { answer: string; hint: string };

const originalTitle = ref("");
const sourceName = ref("");
const sourceUrl = ref("");
const playDate = ref("");
const templateTitle = ref("");
const blanks = ref<BlankDraft[]>([]);
const error = ref<string | null>(null);
const aiBusy = ref(false);
const saveBusy = ref(false);
const publishBusy = ref(false);
const firstField = ref<HTMLInputElement | null>(null);

const anyBusy = computed(
    () => aiBusy.value || saveBusy.value || publishBusy.value,
);

watch(
    () => props.open,
    (open) => {
        if (!open) return;
        const a = props.article;
        const suggestion = a?.aiSuggestion;
        originalTitle.value = a?.originalTitle ?? "";
        sourceName.value = a?.sourceName ?? "";
        sourceUrl.value = a?.sourceUrl ?? "";
        playDate.value = "";
        templateTitle.value = suggestion?.templateTitle ?? "";
        blanks.value = suggestion?.blanks.length
            ? suggestion.blanks.map((b) => ({
                  answer: b.answer,
                  hint: b.hint,
              }))
            : [{ answer: "", hint: "" }];
        error.value = null;
        // biome-ignore lint/style/useVueNextTickPromise: callback form keeps focus logic local
        nextTick(() => firstField.value?.focus());
    },
    { immediate: true },
);

function onKeydown(e: KeyboardEvent) {
    if (e.key === "Escape" && props.open) emit("close");
}

onMounted(() => window.addEventListener("keydown", onKeydown));
onBeforeUnmount(() => window.removeEventListener("keydown", onKeydown));

function addBlank() {
    blanks.value.push({ answer: "", hint: "" });
}

function removeBlank(index: number) {
    if (blanks.value.length > 1) blanks.value.splice(index, 1);
}

async function generateAi() {
    error.value = null;
    aiBusy.value = true;
    try {
        const proposal = await onGenerateAiProposal(
            props.article?.id,
            originalTitle.value,
        );
        templateTitle.value = proposal.templateTitle;
        blanks.value = proposal.blanks.map((b) => ({
            answer: b.answer,
            hint: b.hint,
        }));
    } catch (e) {
        error.value = errMessage(e);
    } finally {
        aiBusy.value = false;
    }
}

function buildSuggestion() {
    const template = templateTitle.value.trim();
    const complete = blanks.value.every(
        (b) => b.answer.trim() && b.hint.trim(),
    );
    if (!template || !/\{\{\d+\}\}/.test(template) || !complete) return null;
    return {
        templateTitle: template,
        blanks: blanks.value.map((b, i) => ({
            index: i,
            answer: b.answer.trim(),
            hint: b.hint.trim(),
        })),
    };
}

async function save() {
    error.value = null;
    saveBusy.value = true;
    try {
        const aiSuggestion = buildSuggestion();
        const fields = {
            originalTitle: originalTitle.value,
            sourceName: sourceName.value,
            sourceUrl: sourceUrl.value,
        };
        if (props.article) {
            const updated = await onUpdateStagedArticle(props.article.id, {
                ...fields,
                aiSuggestion,
            });
            emit("saved", updated);
        } else {
            const created = await onCreateStagedArticle({
                ...fields,
                aiSuggestion,
            });
            emit("saved", created);
        }
        emit("close");
    } catch (e) {
        error.value = errMessage(e);
    } finally {
        saveBusy.value = false;
    }
}

async function publish() {
    error.value = null;
    if (!playDate.value) {
        error.value = "Изберете датум за објава.";
        return;
    }
    if (
        !templateTitle.value.trim() ||
        blanks.value.some((b) => !b.answer.trim() || !b.hint.trim())
    ) {
        error.value = "Пополнете шаблон и одговори за сите зборови.";
        return;
    }
    publishBusy.value = true;
    try {
        const challenge = await onPublishChallenge({
            stagedArticleId: props.article?.id,
            playDate: playDate.value,
            originalTitle: originalTitle.value,
            templateTitle: templateTitle.value,
            sourceName: sourceName.value,
            sourceUrl: sourceUrl.value,
            blanks: blanks.value.map((b, i) => ({
                index: i,
                answer: b.answer,
                hint: b.hint,
            })),
        });
        emit("published", challenge);
        emit("close");
    } catch (e) {
        error.value = errMessage(e);
    } finally {
        publishBusy.value = false;
    }
}
</script>
