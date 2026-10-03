<script setup lang="ts">
import { ticketCategories, ticketPriorities } from '~~/shared/schemas/ticketing'

useHead({ title: 'New ticket' })
const router = useRouter()
const saving = ref(false)
const actionError = ref('')
const { data: registry } = await useFetch('/api/status')
const form = reactive({ title: '', description: '', category: 'BUG', priority: 'MEDIUM', severity: '', assignee: '', environmentId: '' })
const selectedEnvironment = computed(() => registry.value?.environments?.find(item => item.id === form.environmentId))

async function submit() {
  saving.value = true
  actionError.value = ''
  try {
    const env = selectedEnvironment.value
    const response = await $fetch<{ ticket: { id: string } }>('/api/tickets', { method: 'POST', body: {
      ...form,
      source: 'MANUAL',
      severity: form.severity || null,
      assignee: form.assignee || null,
      environmentId: form.environmentId || null,
      customerId: env?.customer.id || null,
      productInstanceId: env?.productInstance?.id || null,
      productId: env?.productInstance?.productId || null,
    } })
    await router.push(`/tickets/${response.ticket.id}`)
  } catch (error) {
    actionError.value = fetchMessage(error, 'Create ticket failed.')
  } finally { saving.value = false }
}
</script>

<template>
  <main class="page narrow">
    <AppPageHeader
      title="New ticket"
      :crumbs="[{ to: '/tickets', label: 'Tickets' }, { label: 'New' }]"
    >
      Create an internal ticket. Customer visibility is not enabled in this release.
    </AppPageHeader>
    <form
      class="card"
      @submit.prevent="submit"
    >
      <label>Title<input
        v-model="form.title"
        required
        maxlength="180"
      ></label>
      <label>Description<textarea
        v-model="form.description"
        required
        rows="8"
      /></label>
      <div class="form-grid">
        <label>Category<select v-model="form.category"><option
          v-for="item in ticketCategories"
          :key="item"
        >{{ item }}</option></select></label>
        <label>Priority<select v-model="form.priority"><option
          v-for="item in ticketPriorities"
          :key="item"
        >{{ item }}</option></select></label>
        <label>Severity<select v-model="form.severity"><option value="">Not set</option><option
          v-for="item in ['INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']"
          :key="item"
        >{{ item }}</option></select></label>
        <label>Assignee<input
          v-model="form.assignee"
          placeholder="Operator label"
        ></label>
      </div>
      <label>Environment (optional)<select v-model="form.environmentId"><option value="">Platform-wide / none</option><option
        v-for="env in registry?.environments || []"
        :key="env.id"
        :value="env.id"
      >{{ env.customer.displayName }} · {{ env.productInstance?.displayName }} · {{ env.displayName }}</option></select></label>
      <p
        v-if="actionError"
        class="action-error"
        role="alert"
      >
        {{ actionError }}
      </p>
      <button
        type="submit"
        :disabled="saving"
      >
        {{ saving ? 'Creating…' : 'Create ticket' }}
      </button>
    </form>
  </main>
</template>
