<script setup lang="ts">
definePageMeta({
  layout: 'internal',
  middleware: ['auth', 'sales'],
})

useHead({
  title: 'Companies',
})

type Company = {
  id: number
  name: string
  notes: string | null
  active: boolean
}

const search = ref('')
const name = ref('')
const notes = ref('')
const errorMessage = ref('')
const saving = ref(false)

const query = computed(() => ({ search: search.value || undefined }))
const { data: companies, error, pending, refresh } = await useFetch<Company[]>('/api/companies', { query })

async function create() {
  errorMessage.value = ''
  saving.value = true
  try {
    const created = await $fetch<Company>('/api/companies', {
      method: 'POST',
      body: { name: name.value, notes: notes.value || undefined },
    })
    name.value = ''
    notes.value = ''
    await refresh()
    await navigateTo(`/companies/${created.id}`)
  } catch (caught: unknown) {
    const err = caught as { data?: { message?: string } }
    errorMessage.value = err.data?.message || 'Could not create that company.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <section class="space-y-6">
    <AppPageHeader
      title="Companies"
      description="Sales Accounts. This is not a Control Plane Customer Account."
    />
    <AppAlert v-if="error || errorMessage">
      {{ errorMessage || 'Could not load companies.' }}
    </AppAlert>
    <AppPanel title="New company">
      <form
        class="grid gap-3 sm:grid-cols-2"
        @submit.prevent="create"
      >
        <AppField
          label="Name"
          required
        >
          <input
            v-model="name"
            class="control"
            required
          >
        </AppField>
        <AppField label="Notes">
          <input
            v-model="notes"
            class="control"
          >
        </AppField>
        <div class="sm:col-span-2">
          <AppButton
            type="submit"
            :loading="saving"
          >
            Create company
          </AppButton>
        </div>
      </form>
    </AppPanel>
    <AppField label="Search">
      <input
        v-model="search"
        class="control"
        placeholder="Filter by name"
      >
    </AppField>
    <p
      v-if="pending && !companies"
      class="text-sm text-muted"
    >
      Loading…
    </p>
    <AppEmpty
      v-else-if="!companies?.length"
      title="No companies yet"
      description="Create a company to start the Sales workflow."
    />
    <ul
      v-else
      class="record-list"
    >
      <li
        v-for="company in companies"
        :key="company.id"
        class="record-item"
      >
        <NuxtLink
          :to="`/companies/${company.id}`"
          class="record-item-title"
        >
          {{ company.name }}
        </NuxtLink>
        <p class="record-item-meta">
          {{ company.active ? 'Active' : 'Inactive' }}
        </p>
      </li>
    </ul>
  </section>
</template>
