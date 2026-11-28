<template>
  <div class="mx-auto max-w-sm">
    <div class="flex items-center gap-3">
      <img src="/assets/lv_logo.svg" alt="" aria-hidden="true" class="h-11 w-auto shrink-0" />
      <h1 class="font-display text-3xl font-black tracking-tight">Регистрација</h1>
    </div>
    <p class="mt-2 text-sm text-ink-soft">Создадете сметка и зачувајте го секој погоден наслов.</p>

    <form class="card mt-5 space-y-4 p-6" @submit.prevent="onSubmit">
      <div>
        <label class="label" for="name">Име</label>
        <input id="name" v-model="name" class="input" type="text" autocomplete="name" maxlength="30" />
        <p class="mt-1 text-xs text-ink-soft">Предложено е автоматски генерирано име — можете да го измените или да го оставите како што е.</p>
      </div>
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
          autocomplete="new-password"
          minlength="8"
          required
        />
        <p class="mt-1 text-xs text-ink-soft">Минимум 8 карактери</p>
      </div>
      <p v-if="error" class="text-sm text-wrong" role="alert">{{ error }}</p>
      <button class="btn btn-primary w-full" type="submit" :disabled="busy">Регистрација</button>
    </form>

    <p class="mt-4 text-center text-sm text-ink-soft">
      Веќе имате сметка?
      <a href="/login" class="font-medium text-accent hover:text-accent-strong">Најавете се</a>
    </p>
  </div>
</template>

<script lang="ts" setup>
import { createAuthClient } from "better-auth/vue";
import { useData } from "vike-vue/useData";
import { onMounted, ref } from "vue";
import type { Data } from "./+data";

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
const data = useData<Data>();
const safeRedirect = ref<string | null>(null);
onMounted(() => {
    const requested =
        new URLSearchParams(window.location.search).get("redirect") ?? "";
    safeRedirect.value =
        requested.startsWith("/") && !requested.startsWith("//")
            ? requested
            : null;
});
const name = ref(data.suggestedName);
const email = ref("");
const password = ref("");
const error = ref<string | null>(null);
const busy = ref(false);

const onSubmit = async () => {
    error.value = null;
    busy.value = true;
    try {
        const res = await authClient.signUp.email({
            name: name.value,
            email: email.value,
            password: password.value,
        });
        if (res.error) {
            error.value = authErrorMessage(
                (res.error as { code?: string }).code,
                res.error.message,
                "Неуспешна регистрација.",
            );
            return;
        }
        window.location.href = safeRedirect.value ?? "/";
    } catch {
        error.value = "Неуспешна регистрација — проверете ја врската.";
    } finally {
        busy.value = false;
    }
};
</script>
