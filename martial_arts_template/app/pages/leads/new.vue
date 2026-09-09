<script setup lang="ts">
import type { LeadRecord } from '#shared/types/crm'
import type { LeadLineRelationship } from '#shared/schemas/enums'
import { createClientId } from '#shared/utils/id'
import {
  LEAD_SOURCES,
  personName,
  sourceLabel,
} from '#shared/utils/labels'
import type { HouseholdPersonDraft } from '../../components/HouseholdPersonFields.vue'

definePageMeta({
  layout: 'internal',
  middleware: ['auth', 'crm'],
})

useHead({
  title: 'New lead',
})

const { user } = useUserSession()
if (user.value?.role === 'VIEWER') {
  await navigateTo('/dashboard')
}

const { data: programs } = await useFetch('/api/programs')
const { data: campaigns } = await useFetch('/api/campaigns')

const form = reactive({
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  source: 'WALK_IN',
  campaignId: '',
  notes: '',
  smsConsent: false,
  emailConsent: false,
})

function newPerson(relationship: LeadLineRelationship, programId = ''): HouseholdPersonDraft {
  return {
    key: createClientId(),
    relationship,
    firstName: '',
    lastName: '',
    age: '',
    experienceLevel: 'UNKNOWN',
    programId,
  }
}

const defaultAdultId = computed(() => String(programs.value?.find(program => program.code === 'ADULT_BJJ')?.id ?? ''))
const defaultKidsId = computed(() => String(programs.value?.find(program => program.code === 'KIDS_BJJ')?.id ?? defaultAdultId.value))

const people = ref<HouseholdPersonDraft[]>([newPerson('SELF', defaultAdultId.value)])

watch(defaultAdultId, (id) => {
  if (!id) {
    return
  }
  people.value = people.value.map((person) => {
    if (person.programId) {
      return person
    }
    return { ...person, programId: person.relationship === 'CHILD' ? defaultKidsId.value : id }
  })
})

const errorMessage = ref('')
const fieldErrors = ref<Record<string, string>>({})
const pending = ref(false)
const duplicates = ref<Array<LeadRecord & { matchKind?: 'PHONE' | 'EMAIL' | 'BOTH' }>>([])
const hideDuplicates = ref(false)
const idempotencyKey = ref('')

const hasSelf = computed(() => people.value.some(person => person.relationship === 'SELF'))

const phoneMatches = computed(() => duplicates.value.filter(item => item.matchKind === 'PHONE' || item.matchKind === 'BOTH'))
const emailMatches = computed(() => duplicates.value.filter(item => item.matchKind === 'EMAIL' || item.matchKind === 'BOTH'))

function programCode(programId: string) {
  return programs.value?.find(program => String(program.id) === String(programId))?.code
}

async function checkDuplicates() {
  hideDuplicates.value = false
  if (!form.phone && !form.email) {
    duplicates.value = []
    return
  }
  duplicates.value = await $fetch<Array<LeadRecord & { matchKind?: 'PHONE' | 'EMAIL' | 'BOTH' }>>('/api/leads/duplicates', {
    query: { phone: form.phone || undefined, email: form.email || undefined },
  })
}

function addPerson() {
  people.value = [...people.value, newPerson('CHILD', defaultKidsId.value || defaultAdultId.value)]
}

function removePerson(key: string) {
  if (people.value.length < 2) {
    return
  }
  people.value = people.value.filter(person => person.key !== key)
}

function updatePerson(next: HouseholdPersonDraft) {
  people.value = people.value.map(person => person.key === next.key ? next : person)
}

function validate(): boolean {
  fieldErrors.value = {}
  if (!form.firstName.trim()) {
    errorMessage.value = 'Household contact first name is required.'
    return false
  }
  if (!form.phone.trim() && !form.email.trim()) {
    errorMessage.value = 'A lead requires a phone number or an email address.'
    return false
  }
  if (people.value.filter(person => person.relationship === 'SELF').length > 1) {
    errorMessage.value = 'Only one prospective member can be the primary contact (Self).'
    return false
  }
  for (const person of people.value) {
    if (person.relationship !== 'SELF' && !person.firstName.trim()) {
      fieldErrors.value[person.key] = 'First name is required.'
    }
    if (!person.programId) {
      fieldErrors.value[person.key] = 'Select a program.'
    }
    if (programCode(person.programId) === 'KIDS_BJJ' && person.age === '') {
      fieldErrors.value[person.key] = 'Child age is required.'
    }
  }
  if (Object.keys(fieldErrors.value).length) {
    errorMessage.value = 'Fix the highlighted prospective members and try again.'
    return false
  }
  return true
}

async function submit() {
  if (pending.value) {
    return
  }
  errorMessage.value = ''
  if (!validate()) {
    return
  }
  pending.value = true
  try {
    if (!idempotencyKey.value) {
      idempotencyKey.value = createClientId()
    }
    const created = await $fetch<LeadRecord>('/api/leads', {
      method: 'POST',
      body: {
        firstName: form.firstName,
        lastName: form.lastName || undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
        source: form.source,
        campaignId: form.campaignId ? Number(form.campaignId) : undefined,
        notes: form.notes || undefined,
        smsConsent: form.smsConsent,
        emailConsent: form.emailConsent,
        idempotencyKey: idempotencyKey.value,
        members: people.value.map(person => ({
          relationship: person.relationship,
          firstName: person.relationship === 'SELF' ? form.firstName : person.firstName,
          lastName: person.relationship === 'SELF' ? (form.lastName || undefined) : (person.lastName || undefined),
          age: person.age === '' ? undefined : Number(person.age),
          programId: Number(person.programId),
          experienceLevel: programCode(person.programId) === 'KIDS_BJJ' ? 'UNKNOWN' : person.experienceLevel,
        })),
      },
    })
    await navigateTo(`/leads/${created.id}`)
  } catch (caught: unknown) {
    const err = caught as { data?: { message?: string }, message?: string }
    errorMessage.value = err.data?.message || err.message || 'Could not create lead.'
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <section class="mx-auto max-w-3xl space-y-6">
    <div>
      <NuxtLink
        to="/leads"
        class="text-sm font-medium text-brand-700 hover:text-brand-600"
      >
        Back to leads
      </NuxtLink>
      <AppPageHeader
        class="mt-2"
        title="New lead"
        description="Record who the academy should contact, then add everyone who may become a member."
      />
    </div>

    <form
      class="space-y-6"
      @submit.prevent="submit"
    >
      <AppAlert v-if="errorMessage">
        {{ errorMessage }}
      </AppAlert>

      <AppPanel
        title="Household contact"
        description="Shared phone, email, source, and campaign for this inquiry."
      >
        <div class="grid gap-4 sm:grid-cols-2">
          <AppField
            label="First name"
            required
          >
            <input
              v-model="form.firstName"
              required
              class="control"
              autocomplete="given-name"
            >
          </AppField>
          <AppField label="Last name">
            <input
              v-model="form.lastName"
              class="control"
              autocomplete="family-name"
            >
          </AppField>
          <AppField label="Phone">
            <input
              v-model="form.phone"
              type="tel"
              inputmode="tel"
              class="control"
              autocomplete="tel"
              @blur="checkDuplicates"
            >
          </AppField>
          <AppField label="Email">
            <input
              v-model="form.email"
              type="email"
              class="control"
              autocomplete="email"
              @blur="checkDuplicates"
            >
          </AppField>
          <AppField label="Source">
            <select
              v-model="form.source"
              class="control"
            >
              <option
                v-for="item in LEAD_SOURCES"
                :key="item"
                :value="item"
              >
                {{ sourceLabel(item) }}
              </option>
            </select>
          </AppField>
          <AppField label="Campaign">
            <select
              v-model="form.campaignId"
              class="control"
            >
              <option value="">
                None
              </option>
              <option
                v-for="campaign in campaigns"
                :key="campaign.id"
                :value="campaign.id"
              >
                {{ campaign.name }}
              </option>
            </select>
          </AppField>
          <AppField
            class="sm:col-span-2"
            label="Household notes"
          >
            <textarea
              v-model="form.notes"
              class="control min-h-24"
              rows="3"
            />
          </AppField>
        </div>
        <div class="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <label class="touch-row">
            <input
              v-model="form.smsConsent"
              type="checkbox"
            >
            OK to text or call
          </label>
          <label class="touch-row">
            <input
              v-model="form.emailConsent"
              type="checkbox"
            >
            OK to email
          </label>
        </div>
        <AppAlert
          v-if="duplicates.length && !hideDuplicates"
          class="mt-4"
          tone="warning"
        >
          <p class="font-semibold">
            Possible duplicate primary contact
          </p>
          <p
            v-if="phoneMatches.length"
            class="mt-2"
          >
            Phone matches:
            <NuxtLink
              v-for="item in phoneMatches"
              :key="`phone-${item.id}`"
              :to="`/leads/${item.id}`"
              class="ml-1 font-medium underline"
            >
              {{ personName(item) }}
            </NuxtLink>
          </p>
          <p
            v-if="emailMatches.length"
            class="mt-1"
          >
            Email matches:
            <NuxtLink
              v-for="item in emailMatches"
              :key="`email-${item.id}`"
              :to="`/leads/${item.id}`"
              class="ml-1 font-medium underline"
            >
              {{ personName(item) }}
            </NuxtLink>
          </p>
          <p class="mt-2 text-sm">
            This will still create a separate household.
          </p>
          <button
            type="button"
            class="mt-2 text-sm font-medium underline"
            @click="hideDuplicates = true"
          >
            Hide warning
          </button>
        </AppAlert>
      </AppPanel>

      <AppPanel
        title="Prospective members"
        description="Each person can have a different program. The household contact does not have to be a prospective member."
      >
        <div class="space-y-4">
          <HouseholdPersonFields
            v-for="person in people"
            :key="person.key"
            :model-value="person"
            :programs="programs ?? []"
            :self-taken="hasSelf && person.relationship !== 'SELF'"
            :can-remove="people.length > 1"
            :error="fieldErrors[person.key]"
            @update:model-value="updatePerson"
            @remove="removePerson(person.key)"
          />
        </div>
        <div class="mt-4">
          <AppButton
            type="button"
            variant="subtle"
            @click="addPerson"
          >
            Add another person
          </AppButton>
        </div>
      </AppPanel>

      <div class="flex flex-wrap gap-3">
        <AppButton
          type="submit"
          :loading="pending"
        >
          Create household
        </AppButton>
      </div>
    </form>
  </section>
</template>
