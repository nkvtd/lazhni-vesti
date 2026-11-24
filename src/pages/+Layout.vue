<template>
  <div class="flex min-h-screen flex-col">
    <Navbar />
    <main class="mx-auto flex w-full max-w-[1400px] flex-1 flex-col px-4 pt-8 pb-16">
      <slot />
    </main>
    <Footer />
  </div>
</template>

<script setup lang="ts">
// biome-ignore lint/correctness/noUnusedImports: used in <template> only
import Footer from "../components/layout/Footer.vue";
// biome-ignore lint/correctness/noUnusedImports: used in <template> only
import Navbar from "../components/layout/Navbar.vue";
</script>
