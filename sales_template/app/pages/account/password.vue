<script setup lang="ts">
import { PASSWORD_POLICY_COPY } from '@crm/core/shared/utils/password-policy'

definePageMeta({
  layout: 'auth',
  middleware: 'auth',
})

useHead({
  title: 'Change password',
})

const { user, fetch: fetchSession, clear } = useUserSession()
const forced = computed(() => Boolean(user.value?.mustChangePassword))
const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const errorMessage = ref('')
const pending = ref(false)

async function submit() {
  errorMessage.value = ''
  if (newPassword.value !== confirmPassword.value) {
    errorMessage.value = 'New password and confirmation do not match.'
    return
  }
  pending.value = true
  try {
    const result = await $fetch('/api/auth/password', {
      method: 'POST',
      body: {
        currentPassword: currentPassword.value,
        newPassword: newPassword.value,
      },
    })
    await fetchSession()
    await navigateTo(result.redirectTo || '/dashboard')
  } catch (caught: unknown) {
    const err = caught as { data?: { message?: string }, message?: string }
    errorMessage.value = err.data?.message || err.message || 'Could not change that password.'
  } finally {
    pending.value = false
  }
}

async function logout() {
  try {
    await $fetch('/api/auth/logout', { method: 'POST' })
  } catch {
    // Session is cleared locally even if the request fails.
  }
  await clear()
  await navigateTo('/login')
}
</script>

<template>
  <section>
    <AppBrandMark
      inverted
      to="/login"
    />
    <h1 class="mt-8 font-display text-3xl font-semibold tracking-tight">
      {{ forced ? 'Set a permanent password' : 'Change password' }}
    </h1>
    <p class="mt-2 text-sm text-white/70">
      {{ forced
        ? 'You must choose a new password before using the rest of the app.'
        : 'Use a password only you know. This signs you in on this browser again.' }}
    </p>

    <form
      class="mt-8 space-y-4 rounded-lg border border-white/10 bg-white p-6 text-ink shadow-xl"
      @submit.prevent="submit"
    >
      <AppAlert v-if="errorMessage">
        {{ errorMessage }}
      </AppAlert>
      <AppField
        label="Current password"
        required
      >
        <input
          v-model="currentPassword"
          type="password"
          required
          autocomplete="current-password"
          class="control"
        >
      </AppField>
      <AppField
        label="New password"
        :hint="PASSWORD_POLICY_COPY"
        required
      >
        <input
          v-model="newPassword"
          type="password"
          required
          autocomplete="new-password"
          class="control"
        >
      </AppField>
      <AppField
        label="Confirm new password"
        required
      >
        <input
          v-model="confirmPassword"
          type="password"
          required
          autocomplete="new-password"
          class="control"
        >
      </AppField>
      <AppButton
        type="submit"
        block
        :loading="pending"
      >
        Save password
      </AppButton>
    </form>
    <p class="mt-6 text-center text-sm text-white/70">
      <button
        type="button"
        class="underline"
        @click="logout"
      >
        Sign out
      </button>
    </p>
  </section>
</template>
