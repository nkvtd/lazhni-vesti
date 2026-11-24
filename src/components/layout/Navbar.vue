<template>
  <header class="sticky top-0 z-40 border-b-2 border-ink bg-paper">
    <div class="mx-auto flex w-full max-w-[1400px] flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3">
      <a href="/" class="flex items-center gap-2"><span class="flex size-7 items-center justify-center rounded-md border-2 border-ink bg-accent font-display text-base font-black text-white shadow-hard-sm" aria-hidden="true">?</span><span class="font-display text-2xl font-black tracking-tight text-ink">Лажни вести<span class="text-accent">?</span></span></a>

      <nav class="flex items-center gap-1.5" aria-label="Главно мени">
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
          <a href="/account" class="max-w-32 truncate text-sm text-ink-soft hover:text-ink">{{ pageContext.user.name }}</a>
        </template>
        <template v-else>
          <a href="/login" class="text-sm text-ink-soft hover:text-ink">Најава</a>
          <a href="/signup" class="btn btn-primary btn-sm">Регистрација</a>
        </template>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
// biome-ignore lint/style/useVueMultiWordComponentNames: "Navbar" is the established name
import { usePageContext } from "vike-vue/usePageContext";

const pageContext = usePageContext();

const isActive = (href: string) =>
    href === "/"
        ? pageContext.urlPathname === "/"
        : pageContext.urlPathname.startsWith(href);

const linkClass = (href: string) =>
    isActive(href)
        ? "rounded-md border-2 border-ink bg-accent px-2.5 py-0.5 text-sm font-bold text-white shadow-hard-sm"
        : "rounded-md border-2 border-transparent px-2.5 py-0.5 text-sm font-bold text-ink-soft hover:border-ink/30 hover:text-ink";
</script>
