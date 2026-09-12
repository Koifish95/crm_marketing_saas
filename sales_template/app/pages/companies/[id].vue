<script setup lang="ts">
definePageMeta({
  layout: 'internal',
  middleware: ['auth', 'sales'],
})

const route = useRoute()
const id = computed(() => Number(route.params.id))

type Company = {
  id: number
  name: string
  notes: string | null
  active: boolean
}

const { data: company, error, pending, refresh } = await useFetch<Company>(() => `/api/companies/${id.value}`)

useHead({
  title: computed(() => company.value?.name || 'Company'),
})

const name = ref('')
const notes = ref('')
const active = ref(true)
const saving = ref(false)
const notice = ref('')
const formError = ref('')

watch(company, (value) => {
  if (!value) {
    return
  }
  name.value = value.name
  notes.value = value.notes || ''
  active.value = value.active
}, { immediate: true })

async function save() {
  formError.value = ''
  notice.value = ''
  saving.value = true
  try {
    await $fetch(`/api/companies/${id.value}`, {
      method: 'PATCH',
      body: { name: name.value, notes: notes.value, active: active.value },
    })
    await refresh()
    notice.value = 'Saved.'
  } catch (caught: unknown) {
    const err = caught as { data?: { message?: string } }
    formError.value = err.data?.message || 'Could not save.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <AppRecordWorkspace :loading="pending && !company">
    <template #header>
      <p class="record-kind">
        Company
      </p>
      <h1 class="record-identity-name">
        {{ company?.name || 'Company' }}
      </h1>
    </template>
    <AppAlert v-if="error || formError">
      {{ formError || 'Could not load this company.' }}
    </AppAlert>
    <AppAlert
      v-if="notice"
      tone="success"
    >
      {{ notice }}
    </AppAlert>
    <form
      v-if="company"
      class="form-measure space-y-4"
      @submit.prevent="save"
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
        <textarea
          v-model="notes"
          class="control"
          rows="4"
        />
      </AppField>
      <label class="touch-row">
        <input
          v-model="active"
          type="checkbox"
        >
        Active
      </label>
      <AppButton
        type="submit"
        :loading="saving"
      >
        Save
      </AppButton>
    </form>
    <p class="mt-6 text-sm">
      <NuxtLink
        :to="`/contacts?accountId=${id}`"
        class="btn btn-subtle text-sm"
      >
        Contacts
      </NuxtLink>
      <NuxtLink
        :to="`/opportunities?accountId=${id}`"
        class="btn btn-subtle text-sm"
      >
        Opportunities
      </NuxtLink>
    </p>
  </AppRecordWorkspace>
</template>
