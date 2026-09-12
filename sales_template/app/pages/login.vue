<script setup lang="ts">
definePageMeta({
  layout: 'auth',
  middleware: 'guest',
})

useHead({
  title: 'Staff login',
})

const config = useRuntimeConfig()
const consoleFor = computed(() => String(config.public.appName || 'Sales CRM'))
const route = useRoute()
const { fetch: fetchSession } = useUserSession()
const identifier = ref('')
const password = ref('')
const errorMessage = ref('')
const pending = ref(false)

async function submit() {
  errorMessage.value = ''
  pending.value = true
  try {
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : undefined
    const result = await $fetch('/api/auth/login', {
      method: 'POST',
      body: {
        identifier: identifier.value,
        password: password.value,
        redirect,
      },
    })
    await fetchSession()
    await navigateTo(result.redirectTo)
  } catch {
    errorMessage.value = 'Invalid email or password.'
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <section>
    <AppBrandMark
      inverted
      to="/login"
    />
    <h1 class="mt-8 font-display text-3xl font-semibold tracking-tight">
      Staff sign-in
    </h1>
    <p class="mt-2 text-sm text-white/70">
      Internal Sales console for {{ consoleFor }}.
    </p>

    <form
      class="mt-8 space-y-4 rounded-lg border border-white/10 bg-white p-6 text-ink shadow-xl"
      novalidate
      @submit.prevent="submit"
    >
      <AppAlert v-if="errorMessage">
        {{ errorMessage }}
      </AppAlert>
      <AppField label="Username or email">
        <input
          v-model="identifier"
          type="text"
          autocomplete="username"
          class="control"
        >
      </AppField>
      <AppField label="Password">
        <input
          v-model="password"
          type="password"
          autocomplete="current-password"
          class="control"
        >
      </AppField>
      <AppButton
        type="submit"
        block
        :loading="pending"
      >
        {{ pending ? 'Signing in…' : 'Sign in' }}
      </AppButton>
    </form>
  </section>
</template>
