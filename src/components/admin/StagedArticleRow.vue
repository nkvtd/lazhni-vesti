<template>
  <li class="px-4 py-3">
    <p class="font-display text-sm font-semibold text-ink">{{ article.originalTitle }}</p>
    <p class="mt-0.5 truncate text-xs text-ink-soft">{{ article.sourceName }} · {{ article.sourceUrl }}</p>
    <div class="mt-1.5 flex flex-wrap items-center gap-1.5">
      <span v-if="article.aiSuggestion" class="chip border-ink bg-accent font-bold text-white shadow-hard-sm">Со шаблон</span>
      <span v-else class="chip border-dashed border-ink/40 bg-paper text-ink-soft">Без шаблон</span>
      <span v-for="kw in article.matchedKeywords" :key="kw" class="chip">{{ kw }}</span>
    </div>
    <div class="mt-2.5 flex items-center gap-2">
      <button type="button" class="btn btn-secondary btn-sm" :disabled="busy" @click="$emit('edit')">Уреди</button>
      <button type="button" class="btn btn-danger btn-sm" :disabled="busy" @click="onDelete">
        {{ confirming ? "Потврди бришење?" : "Избриши" }}
      </button>
    </div>
  </li>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref } from "vue";
import type { Data as AdminData } from "../../pages/admin/+data";

type Staged = AdminData["stagedArticles"][number];

defineProps<{
    article: Staged;
    busy: boolean;
}>();

const emit = defineEmits<{
    edit: [];
    delete: [];
}>();

const confirming = ref(false);
let confirmTimer: ReturnType<typeof setTimeout> | undefined;

function onDelete() {
    if (!confirming.value) {
        confirming.value = true;
        confirmTimer = setTimeout(() => {
            confirming.value = false;
        }, 3000);
        return;
    }
    clearTimeout(confirmTimer);
    confirming.value = false;
    emit("delete");
}

onBeforeUnmount(() => clearTimeout(confirmTimer));
</script>
