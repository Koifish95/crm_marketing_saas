<script setup lang="ts">
import { DEFAULT_PROVISION_FORM, provisionRequestBody } from '~~/shared/utils/provision'

useHead({ title: 'New customer' })

const router = useRouter()
const saving = ref(false)
const actionError = ref('')
const form = reactive({ ...DEFAULT_PROVISION_FORM })

async function createAccount() {
  saving.value = true
  actionError.value = ''
  try {
    const created = await $fetch<{ customerId: string }>('/api/customers', {
      method: 'POST',
      body: provisionRequestBody(form),
    })
    await router.push(`/customers/${created.customerId}`)
  } catch (error) {
    actionError.value = fetchMessage(error, 'Create customer failed.')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <main class="page">
    <AppPageHeader
      title="New customer"
      :crumbs="[{ to: '/customers', label: 'Customers' }, { label: 'New' }]"
    >
      Creates the account only. Add a product instance from the customer workspace.
    </AppPageHeader>
    <form
      class="card"
      @submit.prevent="createAccount"
    >
      <label>
        Display name
        <input
          v-model="form.displayName"
          required
          placeholder="Strategic Insights Consulting, LLC"
        >
      </label>
      <label>
        Slug
        <input
          v-model="form.slug"
          required
          placeholder="strategic-insights"
        >
      </label>
      <label>
        Timezone
        <input
          v-model="form.timezone"
          required
        >
      </label>
      <label>
        Admin email
        <input
          v-model="form.adminEmail"
          type="email"
          required
          placeholder="admin@strategic-insights.local"
        >
      </label>
      <button
        type="submit"
        :disabled="saving"
        :aria-busy="saving"
      >
        {{ saving ? 'Creating…' : 'Create account' }}
      </button>
    </form>
    <p
      v-if="actionError"
      class="muted"
      role="status"
      aria-live="polite"
    >
      {{ actionError }}
    </p>
  </main>
</template>
