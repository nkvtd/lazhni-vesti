<template>
  <div class="card mx-auto mt-16 max-w-md p-6 text-center">
    <h1 class="font-display text-2xl font-bold">{{ heading }}</h1>
    <p class="text-ink-soft">{{ abortReason }}</p>
    <a href="/" class="btn btn-secondary mt-4">Дома</a>
  </div>
</template>

<script lang="ts" setup>
import { usePageContext } from "vike-vue/usePageContext";

const pageContext = usePageContext();
let { is404, abortReason } = pageContext;
if (!abortReason) {
    abortReason = is404
        ? "Оваа страница не постои."
        : "Обидете се повторно подоцна.";
}
const heading = is404 ? "Страницата не е пронајдена" : "Се случи грешка";
</script>
