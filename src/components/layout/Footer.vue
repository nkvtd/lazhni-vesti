<template>
  <footer class="mt-8 border-t-2 border-ink bg-card">
    <div class="mx-auto w-full max-w-[1400px] px-4 py-6">
      <div class="rule-double" aria-hidden="true"></div>
      <img src="/assets/lv_logo.svg" alt="" aria-hidden="true" class="mt-4 block h-7 w-auto mx-auto sm:mx-0" />
      <div class="mt-3 flex flex-col gap-3 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
        <p class="text-xs text-ink-soft">Лажни вести? — сатира врз вистински наслови од македонските портали.</p>
        <nav class="flex items-center justify-center gap-4 text-xs" aria-label="Мени во подножје">
          <a href="/play" class="text-ink-soft hover:text-ink">Игра</a>
          <a href="/archive" class="text-ink-soft hover:text-ink">Архива</a>
          <a href="/leaderboard" class="text-ink-soft hover:text-ink">Рангирање</a>
        </nav>
      </div>
      <p v-if="year" class="mt-3 text-center text-[11px] text-ink-soft/70">© {{ year }} Лажни вести?</p>
    </div>
  </footer>
</template>

<script setup lang="ts">
// biome-ignore lint/style/useVueMultiWordComponentNames: name comes from the layout file
import { onMounted, ref } from "vue";

const year = ref<number | null>(null);
onMounted(() => {
    year.value = new Date().getFullYear();
});
</script>
