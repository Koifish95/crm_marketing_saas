<script setup lang="ts">
definePageMeta({
  layout: 'internal',
  middleware: ['auth', 'sales'],
})

useHead({
  title: 'Activities',
})

type Opportunity = { id: number, name: string }
type Activity = {
  id: number
  description: string
  dueAt: string | Date | null
  completedAt: string | Date | null
  opportunityId: number | null
  accountId: number | null
  contactId: number | null
}

const description = ref('')
const opportunityId = ref('')
const errorMessage = ref('')
const saving = ref(false)

const { data: opportunities } = await useFetch<Opportunity[]>('/api/opportunities')
const { data: activities, error, pending, refresh } = await useFetch<Activity[]>('/api/activities')

function dueLabel(value: string | Date | null) {
  if (!value) {
    return 'No due date'
  }
  return new Date(value).toLocaleString()
}

async function create() {
  errorMessage.value = ''
  saving.value = true
  try {
    await $fetch('/api/activities', {
      method: 'POST',
      body: {
        description: description.value,
        opportunityId: opportunityId.value ? Number(opportunityId.value) : undefined,
      },
    })
    description.value = ''
    await refresh()
  } catch (caught: unknown) {
    const err = caught as { data?: { message?: string } }
    errorMessage.value = err.data?.message || 'Could not create that activity.'
  } finally {
    saving.value = false
  }
}

async function complete(activity: Activity) {
  await $fetch(`/api/activities/${activity.id}`, {
    method: 'PATCH',
    body: { completed: !activity.completedAt },
  })
  await refresh()
}
</script>

<template>
  <section class="space-y-6">
    <AppPageHeader
      title="Activities"
      description="Sales follow-up. This is not Martial Arts FollowUpTask."
    />
    <AppAlert v-if="error || errorMessage">
      {{ errorMessage || 'Could not load activities.' }}
    </AppAlert>
    <AppPanel title="New activity">
      <form
        class="grid gap-3 sm:grid-cols-2"
        @submit.prevent="create"
      >
        <AppField
          label="Description"
          required
        >
          <input
            v-model="description"
            class="control"
            required
          >
        </AppField>
        <AppField
          label="Opportunity"
          hint="Optional if you later attach a company or contact"
        >
          <select
            v-model="opportunityId"
            class="control"
          >
            <option value="">
              Select an opportunity
            </option>
            <option
              v-for="opportunity in opportunities"
              :key="opportunity.id"
              :value="String(opportunity.id)"
            >
              {{ opportunity.name }}
            </option>
          </select>
        </AppField>
        <div class="sm:col-span-2">
          <AppButton
            type="submit"
            :loading="saving"
          >
            Create activity
          </AppButton>
        </div>
      </form>
    </AppPanel>
    <AppEmpty
      v-if="!pending && !activities?.length"
      title="No activities yet"
    />
    <ul
      v-else
      class="record-list"
    >
      <li
        v-for="activity in activities"
        :key="activity.id"
        class="record-item"
      >
        <p
          class="record-item-title"
          :class="{ 'line-through text-muted': activity.completedAt }"
        >
          {{ activity.description }}
        </p>
        <p class="record-item-meta">
          {{ dueLabel(activity.dueAt) }}
        </p>
        <div class="record-item-actions">
          <AppButton
            variant="secondary"
            @click="complete(activity)"
          >
            {{ activity.completedAt ? 'Reopen' : 'Complete' }}
          </AppButton>
        </div>
      </li>
    </ul>
  </section>
</template>
