<script setup lang="ts">
import { DEFAULT_PROVISION_FORM, provisionRequestBody } from '~~/shared/utils/provision'

useHead({ title: 'New customer' })

const router = useRouter()
const provisioning = ref(false)
const actionError = ref('')
const form = reactive({ ...DEFAULT_PROVISION_FORM })

async function provisionCustomer() {
  provisioning.value = true
  actionError.value = ''
  try {
    const created = await $fetch<{ customerId: string }>('/api/customers', {
      method: 'POST',
      body: provisionRequestBody(form),
    })
    await $fetch(`/api/customers/${created.customerId}/provision`, { method: 'POST' })
    await router.push(`/customers/${created.customerId}`)
  } catch (error) {
    actionError.value = fetchMessage(error, 'Provision failed.')
  } finally {
    provisioning.value = false
  }
}
</script>

<template>
  <main class="page">
    <AppPageHeader
      title="New customer"
      :crumbs="[{ to: '/customers', label: 'Customers' }, { label: 'New' }]"
    >
      Creates one PROD and one DEV. Add extras from the customer workspace.
    </AppPageHeader>
    <form
      class="card"
      @submit.prevent="provisionCustomer"
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
        :disabled="provisioning"
        :aria-busy="provisioning"
      >
        {{ provisioning ? 'Provisioning…' : 'Provision' }}
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
