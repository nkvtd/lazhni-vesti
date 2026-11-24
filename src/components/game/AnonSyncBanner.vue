<template>
  <div v-if="show" class="mt-4 rounded-r-md border-l-4 border-amber-300 bg-amber-50 p-3 text-sm text-ink-soft">
    Играте како гостин — напредокот се зачувува само на овој уред.
    <a href="/signup" class="font-medium text-accent hover:text-accent-strong">Регистрирајте се</a>
    за да го чувате скорот и серијата.
  </div>
</template>

<script setup lang="ts">
defineProps<{
    show: boolean;
}>();
</script>
