<script setup lang="ts">
definePageMeta({
  layout: 'internal',
  middleware: 'auth',
})

useHead({
  title: 'Account',
})

const { user, fetch: fetchSession } = useUserSession()
const displayName = ref(user.value?.displayName || '')
const nameError = ref('')
const namePending = ref(false)
const nameSaved = ref(false)

watch(() => user.value?.displayName, (value) => {
  if (value) {
    displayName.value = value
  }
})

async function saveName() {
  nameError.value = ''
  nameSaved.value = false
  namePending.value = true
  try {
    await $fetch('/api/auth/profile', {
      method: 'PATCH',
      body: { displayName: displayName.value },
    })
    await fetchSession()
    nameSaved.value = true
  } catch (caught: unknown) {
    const err = caught as { data?: { message?: string }, message?: string }
    nameError.value = err.data?.message || err.message || 'Could not update your name.'
  } finally {
    namePending.value = false
  }
}
</script>

<template>
  <section class="space-y-6">
    <AppPageHeader
      title="Account"
      description="Your name as it appears to staff. Change your password separately."
    />

    <AppPanel title="Display name">
      <form
        class="max-w-md space-y-4"
        @submit.prevent="saveName"
      >
        <AppAlert v-if="nameError">
          {{ nameError }}
        </AppAlert>
        <AppAlert
          v-if="nameSaved"
          tone="success"
        >
          Name updated.
        </AppAlert>
        <AppField
          label="Name"
          required
        >
          <input
            v-model="displayName"
            type="text"
            required
            maxlength="120"
            class="control"
          >
        </AppField>
        <p class="text-sm text-muted">
          Email: {{ user?.email }}
        </p>
        <AppButton
          type="submit"
          :loading="namePending"
        >
          {{ namePending ? 'Saving…' : 'Save name' }}
        </AppButton>
      </form>
    </AppPanel>

    <AppPanel
      title="Password"
      description="Choose a new password. You will stay signed in on this browser."
    >
      <NuxtLink
        to="/account/password"
        class="btn btn-secondary"
      >
        Change password
      </NuxtLink>
    </AppPanel>
  </section>
</template>
