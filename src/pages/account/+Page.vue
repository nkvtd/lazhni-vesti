<template>
  <div class="mx-auto w-full max-w-3xl">
  <h1 class="font-display text-3xl font-black tracking-tight text-ink">Мој профил</h1>

  <div class="card mt-6 p-5 sm:p-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex min-w-0 items-center gap-4">
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
              <input v-model="nameDraft" class="input max-w-xs" aria-label="Ново име" minlength="3" maxlength="30" required />
              <button type="submit" class="btn btn-primary btn-sm" :disabled="busy">Зачувај</button>
              <button type="button" class="btn btn-secondary btn-sm" @click="cancelEdit">Откажи</button>
            </form>
            <p v-if="nameError" role="alert" class="mt-2 text-sm text-wrong">{{ nameError }}</p>
          </template>

          <p class="mt-1 text-sm text-ink-soft">{{ data.user.email }}</p>
          <p class="text-xs font-bold text-amber-600">
            {{ rank.title }}<span v-if="rank.pointsToNext" class="font-normal text-ink-soft"> · уште {{ rank.pointsToNext }} п. до {{ rank.nextTitle }}</span>
          </p>
        </div>
      </div>
      <button type="button" class="btn btn-sm shrink-0 border-wrong bg-wrong text-white hover:bg-wrong/90" :disabled="signOutBusy" @click="signOut">Одјава</button>
    </div>
    <p v-if="signOutError" role="alert" class="mt-2 text-sm text-wrong">{{ signOutError }}</p>

    <hr class="my-4 border-t border-ink/10" />

    <div class="flex flex-wrap items-center justify-between gap-2">
      <p class="text-sm font-bold text-ink">Лозинка</p>
      <button v-if="!pwEditing" type="button" class="btn btn-secondary btn-sm" @click="startPwEdit">Смени лозинка</button>
    </div>
    <form v-if="pwEditing" class="mt-3 flex flex-col gap-3" @submit.prevent="savePassword">
      <div>
        <label class="label" for="pw-current">Моментална лозинка</label>
        <input id="pw-current" v-model="pwCurrent" class="input" type="password" autocomplete="current-password" required />
      </div>
      <div>
        <label class="label" for="pw-new">Нова лозинка</label>
        <input id="pw-new" v-model="pwNew" class="input" type="password" autocomplete="new-password" minlength="8" required />
        <p class="mt-1 text-xs text-ink-soft">Минимум 8 карактери</p>
      </div>
      <div>
        <label class="label" for="pw-confirm">Потврди нова лозинка</label>
        <input id="pw-confirm" v-model="pwConfirm" class="input" type="password" autocomplete="new-password" minlength="8" required />
      </div>
      <p v-if="pwError" role="alert" class="text-sm text-wrong">{{ pwError }}</p>
      <div class="flex gap-2">
        <button type="submit" class="btn btn-primary btn-sm" :disabled="pwBusy">Зачувај</button>
        <button type="button" class="btn btn-secondary btn-sm" @click="cancelPwEdit">Откажи</button>
      </div>
    </form>
    <p v-else-if="pwSuccess" role="status" class="mt-2 text-sm font-medium text-accent-strong">{{ pwSuccess }}</p>
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

  <div class="card mt-8 p-5">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h2 class="font-display text-xl font-bold">Моето знаење</h2>
      <span class="chip border-ink bg-accent text-white">{{ data.learnedTechniques.length }} / 7 совладани техники</span>
    </div>
    <div class="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
      <div
        v-for="technique in MEDIA_TECHNIQUES"
        :key="technique.id"
        class="rounded-md border-2 p-2"
        :class="data.learnedTechniques.includes(technique.id) ? 'border-ink bg-accent-soft/60' : 'border-dashed border-ink/25 text-ink-soft'"
        :title="technique.definition"
      >
        <span v-if="data.learnedTechniques.includes(technique.id)" class="flex items-center gap-1.5 text-sm font-bold text-ink">
          <BadgeIcon icon="check" class="size-4 shrink-0 text-accent" />
          {{ technique.id }}
        </span>
        <template v-else>
          <span class="block text-sm font-bold">{{ technique.id }}</span>
          <span class="block text-xs">Сè уште неистражена</span>
        </template>
      </div>
    </div>
  </div>

  <div class="card mt-4 p-5">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h2 class="font-display text-xl font-bold">Оваа недела</h2>
      <span class="chip border-ink bg-accent text-white">{{ data.weeklyProgress.won }} / 7 денови</span>
    </div>
    <div class="mt-3 grid grid-cols-7 gap-1">
      <div v-for="(day, i) in WEEK_DAYS" :key="day" class="flex flex-col items-center gap-1">
        <span class="h-6 w-full rounded-sm" :class="i < data.weeklyProgress.won ? 'bg-accent' : i === todayIndex ? 'border-2 border-ink' : 'bg-ink/10'" />
        <span class="text-[10px] text-ink-soft" aria-hidden="true">{{ day }}</span>
      </div>
    </div>
    <p class="mt-2 text-xs text-ink-soft">Освоени денови оваа недела (по ред)</p>
    <p class="sr-only">{{ data.weeklyProgress.won }} од 7 освоени денови оваа недела</p>
  </div>

  </div>
</template>

<script setup lang="ts">
import { createAuthClient } from "better-auth/vue";
import { useData } from "vike-vue/useData";
import { onMounted, ref } from "vue";
// biome-ignore lint/correctness/noUnusedImports: used in <template> only
import BadgeIcon from "../../components/ui/BadgeIcon.vue";
import { errMessage } from "../../utils/error";
// biome-ignore lint/correctness/noUnusedImports: used in <template> only
import { formatIsoDate } from "../../utils/format";
// biome-ignore lint/correctness/noUnusedImports: used in <template> only
import { MEDIA_TECHNIQUES } from "../../utils/mediaLiteracy";
import { getCareerRank } from "../../utils/ranks";
import type { Data } from "./+data";
import { onUpdateUsername } from "./Account.telefunc";

const authClient = createAuthClient();
const data = useData<Data>();

const rank = getCareerRank(data.user.totalPoints);
const WEEK_DAYS = ["пон", "вто", "сре", "чет", "пет", "саб", "нед"];
const todayIndex = ref<number | null>(null);

// Date is client-only so the SSR markup stays deterministic; Mon = 0.
onMounted(() => {
    todayIndex.value = (new Date().getDay() + 6) % 7;
});

const editing = ref(false);
const nameDraft = ref("");
const nameError = ref<string | null>(null);
const signOutError = ref<string | null>(null);
const signOutBusy = ref(false);
const busy = ref(false);

const pwEditing = ref(false);
const pwCurrent = ref("");
const pwNew = ref("");
const pwConfirm = ref("");
const pwError = ref<string | null>(null);
const pwSuccess = ref<string | null>(null);
const pwBusy = ref(false);

const PW_ERRORS: Record<string, string> = {
    INVALID_PASSWORD: "Моменталната лозинка не е точна.",
    PASSWORD_TOO_SHORT: "Новата лозинка мора да има најмалку 8 карактери.",
    PASSWORD_TOO_LONG: "Лозинката е предолга.",
    CREDENTIAL_ACCOUNT_NOT_FOUND:
        "Оваа сметка нема лозинка — најавувате се преку надворешен провајдер.",
};

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
    signOutError.value = null;
    signOutBusy.value = true;
    try {
        await authClient.signOut();
        window.location.href = "/";
    } catch (e) {
        signOutError.value = errMessage(e);
    } finally {
        signOutBusy.value = false;
    }
}

function startPwEdit() {
    pwCurrent.value = "";
    pwNew.value = "";
    pwConfirm.value = "";
    pwError.value = null;
    pwSuccess.value = null;
    pwEditing.value = true;
}

function cancelPwEdit() {
    pwEditing.value = false;
    pwError.value = null;
    pwSuccess.value = null;
    pwCurrent.value = "";
    pwNew.value = "";
    pwConfirm.value = "";
}

async function savePassword() {
    pwError.value = null;
    if (pwNew.value.length < 8) {
        pwError.value = "Новата лозинка мора да има најмалку 8 карактери.";
        return;
    }
    if (pwNew.value !== pwConfirm.value) {
        pwError.value = "Новите лозинки не се совпаѓаат.";
        return;
    }
    pwBusy.value = true;
    try {
        const res = await authClient.changePassword({
            currentPassword: pwCurrent.value,
            newPassword: pwNew.value,
        });
        if (res.error) {
            const code = (res.error as { code?: string }).code;
            pwError.value =
                (code && PW_ERRORS[code]) ||
                res.error.message ||
                "Неуспешна промена на лозинката.";
            return;
        }
        pwSuccess.value = "Лозинката е сменета.";
        pwEditing.value = false;
        pwCurrent.value = "";
        pwNew.value = "";
        pwConfirm.value = "";
    } catch {
        pwError.value = "Неуспешна промена — проверете ја врската.";
    } finally {
        pwBusy.value = false;
    }
}
</script>
