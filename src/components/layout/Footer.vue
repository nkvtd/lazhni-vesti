<template>
  <footer class="mt-8 border-t-2 border-ink bg-card">
    <div class="mx-auto w-full max-w-[1400px] px-4 py-6">
      <div class="rule-double" aria-hidden="true"></div>
      <div class="mt-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <p class="text-xs text-ink-soft">Лажни вести? — сатира врз вистински наслови од македонските портали.</p>
        <nav class="flex items-center gap-4 text-xs" aria-label="Мени во подножје">
          <a href="/" class="text-ink-soft hover:text-ink">Игра</a>
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
