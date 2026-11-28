<template>
  <div v-if="open" class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/40 p-4" @click.self="requestClose">
    <div role="dialog" aria-modal="true" aria-labelledby="challenge-editor-title" class="card my-8 w-full max-w-2xl p-5 sm:p-6">
      <h2 id="challenge-editor-title" class="font-display text-xl font-bold">{{ article ? "Уреди вест" : "Нова вест" }}</h2>

      <form class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2" @submit.prevent>
        <fieldset :disabled="anyBusy" class="contents">
          <p class="text-xs font-semibold uppercase tracking-[0.15em] text-ink-soft sm:col-span-2">Наслов и извор</p>
          <div class="sm:col-span-2">
            <label class="label" for="editor-original-title">Оригинален наслов</label>
            <input id="editor-original-title" ref="firstField" v-model="originalTitle" class="input" :disabled="Boolean(article)" />
          </div>
          <div>
            <label class="label" for="editor-source-name">Извор</label>
            <input id="editor-source-name" v-model="sourceName" class="input" />
          </div>
          <div>
            <label class="label" for="editor-source-url">Линк до изворот</label>
            <input id="editor-source-url" v-model="sourceUrl" class="input" type="url" />
          </div>
          <div class="sm:col-span-2">
            <label class="label" for="editor-excerpt">Исечок од текстот</label>
            <textarea id="editor-excerpt" v-model="articleExcerpt" class="input" rows="2" placeholder="Незадолжително — краток исечок за AI" />
          </div>

          <p class="mt-2 text-xs font-semibold uppercase tracking-[0.15em] text-ink-soft sm:col-span-2">Шаблон и зборови</p>
          <div class="sm:col-span-2">
            <label class="label" for="editor-template">Шаблон на наслов</label>
            <input id="editor-template" v-model="templateTitle" class="input" aria-label="Шаблон на наслов" />
            <p v-pre class="mt-1 text-xs text-ink-soft">Користете {{0}}, {{1}} … за празни места.</p>
          </div>

          <div class="sm:col-span-2">
            <div class="label">Зборови</div>
            <div v-for="(blank, i) in blanks" :key="i" class="mb-3">
              <div class="flex flex-wrap items-center gap-2">
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
              <div class="mt-1 flex flex-wrap items-center gap-2 pl-1">
                <span class="text-xs text-ink-soft">Мамци</span>
                <input
                  v-for="(_, d) in blank.decoys"
                  :key="d"
                  v-model="blank.decoys[d]"
                  class="input max-w-[8rem]"
                  :placeholder="`Дека ${d + 1}`"
                  :aria-label="`Мамец ${d + 1} за збор ${i + 1}`"
                />
              </div>
            </div>
            <button type="button" class="btn btn-secondary btn-sm mt-1" @click="addBlank">Додади збор</button>
          </div>

          <p class="mt-2 text-xs font-semibold uppercase tracking-[0.15em] text-ink-soft sm:col-span-2">Контекст и реалност</p>
          <div class="sm:col-span-2">
            <label class="label" for="editor-event-context">Што се случи?</label>
            <textarea id="editor-event-context" v-model="eventContext" class="input" rows="2" placeholder="1-2 реченици без спојлери за скриените зборови" />
          </div>
          <div>
            <label class="label" for="editor-technique">Техника</label>
            <select id="editor-technique" v-model="techniqueId" class="input">
              <option value="">(без техника)</option>
              <option v-for="technique in MEDIA_TECHNIQUES" :key="technique.id" :value="technique.id">{{ technique.id }}</option>
            </select>
          </div>
          <div class="sm:col-span-2">
            <div class="label">Проверка на реалноста</div>
            <div class="grid gap-2">
              <input
                v-for="(_, i) in realitySummaries"
                :key="i"
                v-model="realitySummaries[i]"
                class="input"
                :placeholder="`Опис ${i + 1}`"
                :aria-label="`Опис ${i + 1} на што навистина пишува`"
              />
            </div>
            <fieldset class="mt-2">
              <legend class="label">Точен одговор</legend>
              <div class="flex gap-4">
                <label v-for="i in 3" :key="i" class="flex items-center gap-1.5 text-sm">
                  <input v-model.number="realityCorrectIndex" type="radio" name="reality-correct" :value="i - 1" />
                  Опис {{ i }}
                </label>
              </div>
            </fieldset>
          </div>

          <p class="mt-2 text-xs font-semibold uppercase tracking-[0.15em] text-ink-soft sm:col-span-2">Објава</p>
          <div>
            <label class="label" for="editor-play-date">Датум за објава</label>
            <input id="editor-play-date" v-model="playDate" class="input" type="date" :min="today" />
          </div>

          <p v-if="error" role="alert" class="text-sm font-medium text-wrong sm:col-span-2">{{ error }}</p>
        </fieldset>
      </form>

      <div class="mt-5 flex flex-wrap items-center gap-2">
        <button type="button" class="btn btn-secondary" :disabled="anyBusy" @click="generateAi">Генерирај AI шаблон</button>
        <span class="flex-1" />
        <button type="button" class="btn btn-secondary" :disabled="anyBusy" @click="save">Зачувај</button>
        <button type="button" class="btn btn-primary" :disabled="anyBusy" @click="publish">Објави предизвик</button>
        <button type="button" class="btn btn-secondary" :disabled="anyBusy" @click="requestClose">Откажи</button>
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
// biome-ignore lint/correctness/noUnusedImports: used in <template> only
import { MEDIA_TECHNIQUES } from "../../utils/mediaLiteracy";

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

type BlankDraft = { answer: string; hint: string; decoys: string[] };

const originalTitle = ref("");
const sourceName = ref("");
const sourceUrl = ref("");
const articleExcerpt = ref("");
const playDate = ref("");
const templateTitle = ref("");
const blanks = ref<BlankDraft[]>([]);
const eventContext = ref("");
const techniqueId = ref("");
const realitySummaries = ref<string[]>(["", "", ""]);
const realityCorrectIndex = ref(0);
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
        articleExcerpt.value = a?.articleExcerpt ?? "";
        playDate.value = a?.playDate ?? "";
        templateTitle.value =
            suggestion?.templateTitle || a?.originalTitle || "";
        blanks.value = suggestion?.blanks.length
            ? suggestion.blanks.map((b) => ({
                  answer: b.answer,
                  hint: b.hint,
                  decoys: [0, 1, 2].map((d) => b.decoys?.[d] ?? ""),
              }))
            : [{ answer: "", hint: "", decoys: ["", "", ""] }];
        eventContext.value = suggestion?.eventContext ?? "";
        techniqueId.value = suggestion?.techniqueId ?? "";
        realitySummaries.value = suggestion?.realityCheck
            ? [...suggestion.realityCheck.summaries]
            : ["", "", ""];
        realityCorrectIndex.value = suggestion?.realityCheck?.correctIndex ?? 0;
        error.value = null;
        // biome-ignore lint/style/useVueNextTickPromise: callback form keeps focus logic local
        nextTick(() => firstField.value?.focus());
    },
    { immediate: true },
);

function onKeydown(e: KeyboardEvent) {
    if (e.key === "Escape" && props.open) requestClose();
}

function requestClose() {
    if (!anyBusy.value) emit("close");
}

onMounted(() => window.addEventListener("keydown", onKeydown));
onBeforeUnmount(() => window.removeEventListener("keydown", onKeydown));

function addBlank() {
    blanks.value.push({ answer: "", hint: "", decoys: ["", "", ""] });
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
            articleExcerpt.value,
        );
        templateTitle.value = proposal.templateTitle;
        blanks.value = proposal.blanks.map((b) => ({
            answer: b.answer,
            hint: b.hint,
            decoys: [0, 1, 2].map((d) => b.decoys?.[d] ?? ""),
        }));
        eventContext.value = proposal.eventContext ?? "";
        techniqueId.value = proposal.techniqueId ?? "";
        realitySummaries.value = proposal.realityCheck
            ? [...proposal.realityCheck.summaries]
            : ["", "", ""];
        realityCorrectIndex.value = proposal.realityCheck?.correctIndex ?? 0;
        if (props.article) {
            emit("saved", {
                ...props.article,
                aiSuggestion: proposal,
            });
        }
    } catch (e) {
        error.value = errMessage(e);
    } finally {
        aiBusy.value = false;
    }
}

function buildDecoys(blank: BlankDraft): string[] | undefined {
    const decoys = blank.decoys.map((d) => d.trim());
    return decoys.every(Boolean) ? decoys : undefined;
}

function buildRealityCheck() {
    const summaries = realitySummaries.value.map((s) => s.trim());
    if (summaries.some((s) => !s)) return null;
    return {
        summaries: summaries as [string, string, string],
        correctIndex: realityCorrectIndex.value,
    };
}

function validateExtras(): string | null {
    for (let i = 0; i < blanks.value.length; i++) {
        const filled = blanks.value[i].decoys.filter((d) => d.trim()).length;
        if (filled > 0 && filled < 3) {
            return `Збор ${i + 1}: пополнете ги сите три мамци или ниту еден.`;
        }
    }
    const filledSummaries = realitySummaries.value.filter((s) =>
        s.trim(),
    ).length;
    if (filledSummaries > 0 && filledSummaries < 3) {
        return "Проверка на реалноста: пополнете ги сите три описи или ниту еден.";
    }
    return null;
}

function buildSuggestion() {
    const template = templateTitle.value.trim();
    const complete = blanks.value.every(
        (b) => b.answer.trim() && b.hint.trim(),
    );
    if (!template || !/\{\{\d+\}\}/.test(template) || !complete) return null;
    const realityCheck = buildRealityCheck();
    return {
        templateTitle: template,
        blanks: blanks.value.map((b, i) => {
            const decoys = buildDecoys(b);
            return {
                index: i,
                answer: b.answer.trim(),
                hint: b.hint.trim(),
                ...(decoys ? { decoys } : {}),
            };
        }),
        ...(eventContext.value.trim()
            ? { eventContext: eventContext.value.trim() }
            : {}),
        ...(techniqueId.value ? { techniqueId: techniqueId.value } : {}),
        ...(realityCheck ? { realityCheck } : {}),
    };
}

function hasAnyDraftInput() {
    const trimmedTemplate = templateTitle.value.trim();
    const templateEdited =
        Boolean(trimmedTemplate) &&
        trimmedTemplate !== originalTitle.value.trim();
    return Boolean(
        templateEdited ||
            blanks.value.some(
                (b) =>
                    b.answer.trim() ||
                    b.hint.trim() ||
                    b.decoys.some((d) => d.trim()),
            ) ||
            eventContext.value.trim() ||
            techniqueId.value ||
            realitySummaries.value.some((s) => s.trim()),
    );
}

async function save() {
    error.value = null;
    saveBusy.value = true;
    try {
        const extrasError = validateExtras();
        if (extrasError) {
            error.value = extrasError;
            return;
        }
        const aiSuggestion = buildSuggestion();
        if (!aiSuggestion && hasAnyDraftInput()) {
            error.value =
                "Пополнете ги сите одговори и хинтови — или исчистете ги сите полиња.";
            return;
        }
        const fields = {
            originalTitle: originalTitle.value,
            sourceName: sourceName.value,
            sourceUrl: sourceUrl.value,
            articleExcerpt: articleExcerpt.value || null,
            playDate: playDate.value || null,
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
    const extrasError = validateExtras();
    if (extrasError) {
        error.value = extrasError;
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
            blanks: blanks.value.map((b, i) => {
                const decoys = buildDecoys(b);
                return {
                    index: i,
                    answer: b.answer.trim(),
                    hint: b.hint.trim(),
                    ...(decoys ? { decoys } : {}),
                };
            }),
            eventContext: eventContext.value.trim() || undefined,
            techniqueId: techniqueId.value || undefined,
            realityCheck: buildRealityCheck() ?? undefined,
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
