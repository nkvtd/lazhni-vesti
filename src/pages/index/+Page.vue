<template>
  <h1 class="sr-only">Дневниот предизвик</h1>
  <div class="flex flex-1 items-center justify-center gap-8 py-4 xl:gap-10">
    <!-- Лев rail: правила -->
    <aside class="hidden w-64 shrink-0 xl:block" aria-label="Како се игра">
      <div class="card p-5">
        <h2 class="font-display text-lg font-black text-ink">Како се игра</h2>
        <ul class="mt-4 space-y-3 text-sm text-ink-soft">
          <li class="flex items-start gap-2"><span class="mt-1 inline-block size-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true"></span>Погоди ги зборовите што недостасуваат во насловот.</li>
          <li class="flex items-start gap-2"><span class="mt-1 inline-block size-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true"></span>Почнувате со <strong class="font-display text-ink">1000</strong> поени.</li>
          <li class="flex items-start gap-2"><span class="mt-1 inline-block size-1.5 shrink-0 rounded-full bg-wrong" aria-hidden="true"></span>Погрешен збор: <strong class="font-display text-wrong">−50</strong> поени.</li>
          <li class="flex items-start gap-2"><span class="mt-1 inline-block size-1.5 shrink-0 rounded-full bg-amber-500" aria-hidden="true"></span>Хинт: <strong class="font-display text-amber-600">−250</strong> поени.</li>
          <li class="flex items-start gap-2"><span class="mt-1 inline-block size-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true"></span>Решете ги сите зборови пред поените да паднат на нула.</li>
        </ul>
      </div>
    </aside>

    <GamePlay class="w-full max-w-xl sm:max-w-2xl lg:max-w-3xl" :initial-challenge="data.challenge" />

    <!-- Десен rail: скор / гостин -->
    <aside class="hidden w-64 shrink-0 xl:block" aria-label="Вашиот скор">
      <div v-if="pageContext.user" class="card p-5">
        <h2 class="font-display text-lg font-black text-ink">Вашиот скор</h2>
        <dl class="mt-4 space-y-3">
          <div>
            <dt class="text-xs font-bold tracking-wide text-ink-soft">Вкупно поени</dt>
            <dd class="font-display text-3xl font-black tabular-nums text-amber-600">{{ pageContext.user.totalPoints }}</dd>
          </div>
          <div>
            <dt class="text-xs font-bold tracking-wide text-ink-soft">Тековна серија</dt>
            <dd class="flex items-center gap-1.5 font-display text-3xl font-black tabular-nums text-ink">
              {{ pageContext.user.currentStreak }} 
              <span v-if="pageContext.user.currentStreak > 0" class="text-xs font-normal text-ink-soft">дена</span>
              <svg v-if="pageContext.user.currentStreak > 0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-5 text-amber-600" aria-hidden="true"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>
            </dd>
          </div>
        </dl>
        <a href="/leaderboard" class="btn btn-secondary btn-sm mt-4 w-full">Рангирање</a>
      </div>
      <div v-else class="card p-5">
        <h2 class="font-display text-lg font-black text-ink">Нов сте тука?</h2>
        <p class="mt-2 text-sm text-ink-soft">Играте како гостин — напредокот се чува само на овој уред.</p>
        <a href="/login" class="btn btn-secondary btn-sm mt-4 w-full">Најава</a>
        <a href="/signup" class="btn btn-primary btn-sm mt-2 w-full">Регистрација</a>
      </div>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { useData } from "vike-vue/useData";
import { usePageContext } from "vike-vue/usePageContext";
import GamePlay from "../../components/game/GamePlay.vue";
import type { Data } from "./+data";

const data = useData<Data>();
const pageContext = usePageContext();
</script>
