<template>
  <div class="mx-auto w-full max-w-3xl">
  <h1 class="font-display text-3xl font-black tracking-tight text-ink">Мој профил</h1>

  <div class="card mt-6 p-5 sm:p-6">
    <div class="flex items-center gap-4">
      <span class="flex size-14 shrink-0 items-center justify-center rounded-xl border-2 border-ink bg-accent font-display text-2xl font-black text-white shadow-hard-sm" aria-hidden="true">{{ data.user.name.charAt(0).toUpperCase() }}</span>
      <div class="min-w-0 flex-1">
        <template v-if="!editing">
          <div class="flex flex-wrap items-center gap-2">
            <p class="font-display text-xl font-bold text-ink">{{ data.user.name }}</p>
            <button type="button" class="btn btn-secondary btn-sm" @click="startEdit">Смени име</button>
          </div>
        </template>
        <template v-else>
          <form class="flex flex-wrap items-center gap-2" @submit.prevent="saveName">
            <input v-model="nameDraft" class="input max-w-xs" aria-label="Ново име" maxlength="30" />
            <button type="submit" class="btn btn-primary btn-sm" :disabled="busy">Зачувај</button>
            <button type="button" class="btn btn-secondary btn-sm" @click="cancelEdit">Откажи</button>
          </form>
          <p v-if="nameError" role="alert" class="mt-2 text-sm text-wrong">{{ nameError }}</p>
        </template>

        <p class="mt-1 text-sm text-ink-soft">{{ data.user.email }}</p>
      </div>
    </div>
  </div>

  <dl class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
    <div class="rounded-xl border-2 border-ink bg-card p-4 shadow-hard-sm">
      <dt class="text-xs font-medium tracking-wide text-ink-soft">Вкупно поени</dt>
      <dd class="mt-1 font-display text-2xl font-black tabular-nums text-amber-600">{{ data.user.totalPoints }}</dd>
    </div>
    <div class="rounded-xl border-2 border-ink bg-card p-4 shadow-hard-sm">
      <dt class="text-xs font-medium tracking-wide text-ink-soft">Тековна серија</dt>
      <dd class="mt-1 flex items-center gap-1 font-display text-2xl font-black text-ink">
        {{ data.user.currentStreak }}
        <span v-if="data.user.currentStreak > 0" class="text-xs font-normal text-ink-soft">дена</span>
        <svg
          v-if="data.user.currentStreak > 0"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="size-5 text-amber-600"
          aria-hidden="true"
        >
          <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
        </svg>
      </dd>
    </div>
    <div class="rounded-xl border-2 border-ink bg-card p-4 shadow-hard-sm">
      <dt class="text-xs font-medium tracking-wide text-ink-soft">Најдолга серија</dt>
      <dd class="mt-1 font-display text-2xl font-black text-ink">{{ data.user.longestStreak }}</dd>
    </div>
  </dl>

  <section class="mt-8">
    <h2 class="border-b-2 border-ink pb-1 font-display text-xl font-bold">Значки</h2>
    <p v-if="!data.earnedBadges.length" class="mt-3 text-sm text-ink-soft">Сè уште нема освоени значки. Играјте секој ден!</p>
    <ul v-else class="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
      <li v-for="badge in data.earnedBadges" :key="badge.id" class="flex items-start gap-3 rounded-xl border-2 border-ink bg-card p-4 shadow-hard-sm">
        <span class="flex size-12 shrink-0 items-center justify-center rounded-md border-2 border-ink bg-accent-soft text-accent-strong">
          <BadgeIcon :icon="badge.icon" class="size-6" />
        </span>
        <span class="min-w-0">
          <span class="block text-sm font-semibold text-ink">{{ badge.name }}</span>
          <span class="block text-xs text-ink-soft">{{ badge.description }}</span>
          <span class="mt-1 block text-xs text-ink-soft">Добиена на {{ formatIsoDate(badge.awardedAt) }}</span>
        </span>
      </li>
    </ul>
  </section>

  <section class="mt-8">
    <h2 class="border-b-2 border-ink pb-1 font-display text-xl font-bold">Time Machine</h2>
    <div class="mt-3 rounded-xl border-2 border-ink bg-card p-5 shadow-hard-sm">
      <div class="flex items-start gap-3">
        <span class="flex size-10 shrink-0 items-center justify-center rounded-md border-2 border-ink bg-amber-400 text-ink shadow-hard-sm">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="size-5"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </span>
        <div class="min-w-0">
          <p class="text-sm text-ink-soft">
            Враќање на пропуштен ден од архивата — ги поправа серијата и месечните значки.
          </p>
          <p class="mt-1 text-sm">
            Чини <strong class="font-display text-amber-600">{{ data.timeMachine.cost }}</strong> п. · Останати користења овој месец: <strong class="font-display">{{ data.timeMachine.remainingUses }} / 2</strong>
          </p>
        </div>
      </div>
    </div>
  </section>

  <button type="button" class="btn btn-secondary mt-8" :disabled="busy" @click="signOut">Одјава</button>
  </div>
</template>

<script setup lang="ts">
import { createAuthClient } from "better-auth/vue";
import { navigate } from "vike/client/router";
import { useData } from "vike-vue/useData";
import { ref } from "vue";
import BadgeIcon from "../../components/ui/BadgeIcon.vue";
import { errMessage } from "../../utils/error";
import { formatIsoDate } from "../../utils/format";
import type { Data } from "./+data";
import { onUpdateUsername } from "./Account.telefunc";

const authClient = createAuthClient();
const data = useData<Data>();

const editing = ref(false);
const nameDraft = ref("");
const nameError = ref<string | null>(null);
const busy = ref(false);

function startEdit() {
    nameDraft.value = data.user.name;
    nameError.value = null;
    editing.value = true;
}

function cancelEdit() {
    editing.value = false;
    nameError.value = null;
}

async function saveName() {
    nameError.value = null;
    busy.value = true;
    try {
        await onUpdateUsername(nameDraft.value);
        window.location.reload();
    } catch (e) {
        nameError.value = errMessage(e);
    } finally {
        busy.value = false;
    }
}

async function signOut() {
    busy.value = true;
    try {
        await authClient.signOut();
        await navigate("/");
    } finally {
        busy.value = false;
    }
}
</script>
