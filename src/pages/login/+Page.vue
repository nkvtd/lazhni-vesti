<template>
  <div class="mx-auto max-w-sm">
    <div class="flex items-center gap-3">
      <span class="flex size-11 shrink-0 items-center justify-center rounded-lg border-2 border-ink bg-accent font-display text-2xl font-black text-white shadow-hard-sm" aria-hidden="true">?</span>
      <h1 class="font-display text-3xl font-black tracking-tight">Најава</h1>
    </div>
    <p class="mt-2 text-sm text-ink-soft">Најавете се за да го чувате скорот и дневната серија.</p>

    <form class="card mt-5 space-y-4 p-6" @submit.prevent="onSubmit">
      <div>
        <label class="label" for="email">Е-пошта</label>
        <input id="email" v-model="email" class="input" type="email" autocomplete="email" required />
      </div>
      <div>
        <label class="label" for="password">Лозинка</label>
        <input
          id="password"
          v-model="password"
          class="input"
          type="password"
          autocomplete="current-password"
          required
        />
      </div>
      <p v-if="error" class="text-sm text-wrong" role="alert">{{ error }}</p>
      <button class="btn btn-primary w-full" type="submit" :disabled="busy">Најава</button>
    </form>

    <p class="mt-4 text-center text-sm text-ink-soft">
      Немате сметка?
      <a href="/signup" class="font-medium text-accent hover:text-accent-strong">Регистрирајте се</a>
    </p>
  </div>
</template>

<script lang="ts" setup>
import { createAuthClient } from "better-auth/vue";
import { navigate } from "vike/client/router";
import { ref } from "vue";

const authClient = createAuthClient();
const email = ref("");
const password = ref("");
const error = ref<string | null>(null);
const busy = ref(false);

const onSubmit = async () => {
    error.value = null;
    busy.value = true;
    const res = await authClient.signIn.email({
        email: email.value,
        password: password.value,
    });
    if (res.error) {
        error.value = res.error.message ?? "Неуспешна најава.";
        busy.value = false;
        return;
    }
    await navigate("/account");
};
</script>
