<template>
  <div class="mx-auto max-w-sm">
    <div class="flex items-center gap-3">
      <img src="/assets/lv-logo.svg" alt="" aria-hidden="true" class="h-11 w-auto shrink-0" />
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
import { ref } from "vue";

const AUTH_ERRORS: Record<string, string> = {
    INVALID_EMAIL_OR_PASSWORD: "Погрешна е-пошта или лозинка.",
    USER_ALREADY_EXISTS: "Веќе постои сметка со оваа е-пошта.",
    USER_ALREADY_EXISTS_AND_OAUTH_ACCESS_TOKEN_BLOWS:
        "Веќе постои сметка со оваа е-пошта.",
};

function authErrorMessage(
    code: string | undefined,
    message: string | undefined,
    fallback: string,
): string {
    return (code && AUTH_ERRORS[code]) || message || fallback;
}

const authClient = createAuthClient();
const email = ref("");
const password = ref("");
const error = ref<string | null>(null);
const busy = ref(false);

const onSubmit = async () => {
    error.value = null;
    busy.value = true;
    try {
        const res = await authClient.signIn.email({
            email: email.value,
            password: password.value,
        });
        if (res.error) {
            error.value = authErrorMessage(
                (res.error as { code?: string }).code,
                res.error.message,
                "Неуспешна најава.",
            );
            return;
        }
        // Full reload so SSR re-hydrates pageContext.user and guest progress syncs.
        window.location.href = "/";
    } catch {
        error.value = "Неуспешна најава — проверете ја врската.";
    } finally {
        busy.value = false;
    }
};
</script>
