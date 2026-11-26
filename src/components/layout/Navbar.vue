<template>
  <header ref="headerEl" class="sticky top-0 z-40 border-b-2 border-ink bg-paper">
    <div class="mx-auto flex w-full max-w-[1400px] items-center justify-between gap-3 px-4 py-3">
      <a href="/" class="flex items-center whitespace-nowrap">
        <img src="/assets/lv_logo.svg" alt="Лажни вести?" class="h-9 w-auto sm:h-10" />
      </a>

      <nav class="hidden items-center gap-1.5 md:flex" aria-label="Главно мени">
        <a href="/" :class="linkClass('/')" :aria-current="isActive('/') ? 'page' : undefined">Игра</a>
        <a href="/archive" :class="linkClass('/archive')" :aria-current="isActive('/archive') ? 'page' : undefined">Архива</a>
        <a href="/leaderboard" :class="linkClass('/leaderboard')" :aria-current="isActive('/leaderboard') ? 'page' : undefined">
          Рангирање
        </a>
        <a v-if="pageContext.user?.role === 'admin'" href="/admin" :class="linkClass('/admin')" :aria-current="isActive('/admin') ? 'page' : undefined">
          Админ
        </a>
      </nav>

      <div class="flex items-center gap-4">
        <template v-if="pageContext.user">
          <span
            v-if="pageContext.user.currentStreak > 0"
            class="inline-flex items-center gap-1 rounded-md border-2 border-ink bg-amber-400 px-1.5 py-0.5 text-sm font-bold text-ink shadow-hard-sm"
            title="Тековна серија"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="size-4"
              aria-hidden="true"
            >
              <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
            </svg>
            {{ pageContext.user.currentStreak }}
          </span>
          <a href="/account" class="hidden max-w-32 truncate text-sm text-ink-soft hover:text-ink sm:inline">{{ pageContext.user.name }}</a>
        </template>
        <template v-else>
          <a href="/login" class="hidden text-sm text-ink-soft hover:text-ink md:inline">Најава</a>
          <a href="/signup" class="btn btn-primary btn-sm hidden md:inline-flex">Регистрација</a>
        </template>
        <button
          type="button"
          class="btn btn-secondary btn-sm md:hidden"
          :aria-expanded="menuOpen"
          aria-controls="main-menu"
          aria-label="Главно мени"
          @click="menuOpen = !menuOpen"
        >
          <svg v-if="!menuOpen" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4" aria-hidden="true"><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
          <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      </div>
    </div>

    <nav id="main-menu" v-show="menuOpen" class="border-t-2 border-ink/10 bg-paper md:hidden" aria-label="Главно мени">
      <div class="mx-auto flex w-full max-w-[1400px] flex-col gap-1 px-4 py-3">
        <a href="/" :class="mobileLinkClass('/')" :aria-current="isActive('/') ? 'page' : undefined" class="rounded-md px-3 py-2 text-sm font-bold" @click="menuOpen = false">Игра</a>
        <a href="/archive" :class="mobileLinkClass('/archive')" :aria-current="isActive('/archive') ? 'page' : undefined" class="rounded-md px-3 py-2 text-sm font-bold" @click="menuOpen = false">Архива</a>
        <a href="/leaderboard" :class="mobileLinkClass('/leaderboard')" :aria-current="isActive('/leaderboard') ? 'page' : undefined" class="rounded-md px-3 py-2 text-sm font-bold" @click="menuOpen = false">Рангирање</a>
        <a v-if="pageContext.user?.role === 'admin'" href="/admin" :class="mobileLinkClass('/admin')" :aria-current="isActive('/admin') ? 'page' : undefined" class="rounded-md px-3 py-2 text-sm font-bold" @click="menuOpen = false">Админ</a>
        <hr class="my-1 border-ink/10" />
        <template v-if="!pageContext.user">
          <a href="/login" class="rounded-md px-3 py-2 text-sm font-bold text-ink-soft hover:bg-accent-soft hover:text-ink" @click="menuOpen = false">Најава</a>
          <a href="/signup" class="rounded-md px-3 py-2 text-sm font-bold text-ink-soft hover:bg-accent-soft hover:text-ink" @click="menuOpen = false">Регистрација</a>
        </template>
        <a v-else href="/account" class="rounded-md px-3 py-2 text-sm font-bold text-ink-soft hover:bg-accent-soft hover:text-ink" @click="menuOpen = false">Мој профил ({{ pageContext.user.name }})</a>
      </div>
    </nav>
  </header>
</template>

<script setup lang="ts">
// biome-ignore lint/style/useVueMultiWordComponentNames: "Navbar" is the established name
import { usePageContext } from "vike-vue/usePageContext";
import { onBeforeUnmount, onMounted, ref, watch } from "vue";

const pageContext = usePageContext();

const menuOpen = ref(false);
const headerEl = ref<HTMLElement | null>(null);

watch(
    () => pageContext.urlPathname,
    () => {
        menuOpen.value = false;
    },
);

function onKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") menuOpen.value = false;
}

function onDocumentClick(e: MouseEvent) {
    if (menuOpen.value && !headerEl.value?.contains(e.target as Node)) {
        menuOpen.value = false;
    }
}

onMounted(() => {
    document.addEventListener("keydown", onKeydown);
    document.addEventListener("click", onDocumentClick);
});
onBeforeUnmount(() => {
    document.removeEventListener("keydown", onKeydown);
    document.removeEventListener("click", onDocumentClick);
});

const isActive = (href: string) =>
    href === "/"
        ? pageContext.urlPathname === "/"
        : pageContext.urlPathname.startsWith(href);

const linkClass = (href: string) =>
    isActive(href)
        ? "rounded-md border-2 border-ink bg-accent px-2.5 py-0.5 text-sm font-bold text-white shadow-hard-sm"
        : "rounded-md border-2 border-transparent px-2.5 py-0.5 text-sm font-bold text-ink-soft hover:border-ink/30 hover:text-ink";

const mobileLinkClass = (href: string) =>
    isActive(href)
        ? "bg-accent text-white"
        : "text-ink-soft hover:bg-accent-soft hover:text-ink";
</script>
