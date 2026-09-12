<script setup lang="ts">
const props = defineProps<{
  recordKind: 'lead' | 'company' | 'contact' | 'opportunity'
  recordId: number
}>()

type HistoryNote = {
  id: number
  body: string
  createdAt: string | Date | number
}

const body = ref('')
const saving = ref(false)
const errorMessage = ref('')
const query = computed(() => ({
  recordKind: props.recordKind,
  recordId: String(props.recordId),
}))
const { data: notes, refresh } = await useFetch<HistoryNote[]>('/api/notes', { query })

function when(value: string | Date | number) {
  return new Date(value).toLocaleString()
}

async function addNote() {
  errorMessage.value = ''
  saving.value = true
  try {
    await $fetch('/api/notes', {
      method: 'POST',
      body: { recordKind: props.recordKind, recordId: props.recordId, body: body.value },
    })
    body.value = ''
    await refresh()
  } catch (caught: unknown) {
    const err = caught as { data?: { message?: string } }
    errorMessage.value = err.data?.message || 'Could not add that note.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <AppPanel title="History">
    <AppAlert v-if="errorMessage">
      {{ errorMessage }}
    </AppAlert>
    <form
      class="space-y-3"
      @submit.prevent="addNote"
    >
      <AppField
        label="Add note"
        required
      >
        <textarea
          v-model="body"
          class="control"
          rows="3"
          required
        />
      </AppField>
      <AppButton
        type="submit"
        :loading="saving"
      >
        Add to history
      </AppButton>
    </form>
    <ul
      v-if="notes?.length"
      class="mt-4 space-y-3"
    >
      <li
        v-for="note in notes"
        :key="note.id"
        class="border-t border-navy-600/10 pt-3"
      >
        <p class="text-xs text-muted">
          {{ when(note.createdAt) }}
        </p>
        <p class="mt-1 whitespace-pre-wrap text-sm">
          {{ note.body }}
        </p>
      </li>
    </ul>
    <p
      v-else
      class="mt-3 text-sm text-muted"
    >
      No history yet.
    </p>
  </AppPanel>
</template>
