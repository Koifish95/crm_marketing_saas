<script setup lang="ts">
import { createClientId } from '#shared/utils/id'
import { BOOKING_HORIZON_DAYS } from '#shared/utils/intro'
import { attributionFromQuery, capturePublicAttribution } from '#shared/utils/public-attribution'
import { formatDenverLongDate } from '#shared/utils/time'
import type { TrialPersonDraft } from '~/components/TrialPersonBooking.vue'

definePageMeta({
  layout: 'default',
})

useHead({
  title: 'Book a free class',
})

const config = useRuntimeConfig()
const brandName = computed(() => String(config.public.brandName || 'Martial Arts'))
const publicTagline = computed(() => String(config.public.publicTagline || ''))

const route = useRoute()
const attribution = ref(attributionFromQuery(route.query))
if (import.meta.client) {
  attribution.value = capturePublicAttribution(route.query)
}

type BookingShape = 'ONE' | 'FAMILY'
type OneWho = 'SELF' | 'CHILD'

const shape = ref<BookingShape | null>(null)
const oneWho = ref<OneWho>('SELF')
const pending = ref(false)
const errorMessage = ref('')
const contactParticipating = ref(true)
let personSeq = 0

function nextKey() {
  personSeq += 1
  return `person-${personSeq}`
}

function blankPerson(relationship: TrialPersonDraft['relationship'], programCode: TrialPersonDraft['programCode']): TrialPersonDraft {
  return {
    key: nextKey(),
    relationship,
    firstName: '',
    lastName: '',
    age: '',
    experienceLevel: 'UNKNOWN',
    programCode,
    slotId: '',
    selectedDate: '',
  }
}

const onePerson = ref<TrialPersonDraft>(blankPerson('SELF', 'ADULT_BJJ'))
const familyPeople = ref<TrialPersonDraft[]>([])
const selfPerson = ref<TrialPersonDraft>(blankPerson('SELF', 'ADULT_BJJ'))

const confirmation = ref<{
  householdContactName?: string
  people: Array<{
    firstName: string
    lastName?: string | null
    programName?: string
    className: string
    date: string
    time: string
  }>
} | null>(null)

const form = reactive({
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  smsConsent: false,
  emailConsent: false,
  guardianRelationship: 'parent',
  company: '',
})
const idempotencyKey = ref('')

watch(oneWho, (value) => {
  onePerson.value = blankPerson(
    value === 'CHILD' ? 'CHILD' : 'SELF',
    value === 'CHILD' ? 'KIDS_BJJ' : 'ADULT_BJJ',
  )
})

watch(shape, () => {
  errorMessage.value = ''
})

watch(contactParticipating, (value) => {
  if (!value && !familyPeople.value.length) {
    familyPeople.value.push(blankPerson('CHILD', 'KIDS_BJJ'))
  }
}, { immediate: true })

const membersReady = computed(() => {
  if (shape.value === 'ONE') {
    return Boolean(onePerson.value.slotId)
  }
  if (shape.value === 'FAMILY') {
    const extras = familyPeople.value.filter(person => person.firstName.trim() && person.slotId)
    const selfReady = contactParticipating.value && selfPerson.value.slotId
    return Boolean(selfReady || extras.length)
  }
  return false
})

function addFamilyPerson() {
  familyPeople.value.push(blankPerson('CHILD', 'KIDS_BJJ'))
}

function removeFamilyPerson(key: string) {
  familyPeople.value = familyPeople.value.filter(person => person.key !== key)
  if (!familyPeople.value.length && !contactParticipating.value) {
    familyPeople.value.push(blankPerson('CHILD', 'KIDS_BJJ'))
  }
}

function toMember(person: TrialPersonDraft, identity?: { firstName: string, lastName: string }) {
  return {
    relationship: person.relationship,
    firstName: identity?.firstName || person.firstName,
    lastName: identity?.lastName || person.lastName || undefined,
    age: person.programCode === 'KIDS_BJJ' && person.age ? Number(person.age) : undefined,
    experienceLevel: person.programCode === 'ADULT_BJJ' ? person.experienceLevel : 'UNKNOWN',
    programCode: person.programCode,
    slotId: person.slotId,
  }
}

async function submit() {
  if (pending.value) {
    return
  }
  errorMessage.value = ''
  if (!shape.value) {
    errorMessage.value = 'Choose who you would like to book for.'
    return
  }
  const members = []
  if (shape.value === 'ONE') {
    if (oneWho.value === 'SELF') {
      members.push(toMember(onePerson.value, { firstName: form.firstName, lastName: form.lastName }))
    } else {
      members.push(toMember({ ...onePerson.value, relationship: 'CHILD' }))
    }
  } else {
    if (contactParticipating.value) {
      members.push(toMember(selfPerson.value, { firstName: form.firstName, lastName: form.lastName }))
    }
    for (const person of familyPeople.value) {
      if (person.firstName.trim() && person.slotId) {
        members.push(toMember(person))
      }
    }
  }
  if (!members.length) {
    errorMessage.value = 'Add at least one person and class time.'
    return
  }
  pending.value = true
  try {
    if (!idempotencyKey.value) {
      idempotencyKey.value = createClientId()
    }
    const result = await $fetch<{
      confirmation: {
        householdContactName?: string
        firstName: string
        lastName?: string | null
        participantFirstName?: string | null
        className: string
        date: string
        time: string
        people: Array<{
          firstName: string
          lastName?: string | null
          programName?: string
          className: string
          date: string
          time: string
        }>
      }
    }>('/api/public/trial', {
      method: 'POST',
      body: {
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone,
        email: form.email || undefined,
        smsConsent: form.smsConsent,
        emailConsent: form.emailConsent,
        guardianRelationship: shape.value === 'ONE' && oneWho.value === 'CHILD'
          ? form.guardianRelationship
          : undefined,
        members,
        idempotencyKey: idempotencyKey.value,
        source: attribution.value?.source,
        campaign: attribution.value?.campaign,
        trackingCode: attribution.value?.trackingCode,
        utmSource: attribution.value?.utmSource,
        utmMedium: attribution.value?.utmMedium,
        utmContent: attribution.value?.utmContent,
        utmTerm: attribution.value?.utmTerm,
        company: form.company,
      },
    })
    confirmation.value = {
      householdContactName: result.confirmation.householdContactName
        || [result.confirmation.firstName, result.confirmation.lastName].filter(Boolean).join(' '),
      people: result.confirmation.people?.length
        ? result.confirmation.people
        : [{
            firstName: result.confirmation.participantFirstName || result.confirmation.firstName,
            className: result.confirmation.className,
            date: result.confirmation.date,
            time: result.confirmation.time,
          }],
    }
  } catch (caught: unknown) {
    const err = caught as { data?: { message?: string }, statusCode?: number, message?: string }
    errorMessage.value = err.data?.message || err.message || 'Could not schedule that intro.'
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <section class="mx-auto max-w-xl space-y-8">
    <div class="text-center sm:text-left">
      <p class="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-600">
        {{ brandName }}
      </p>
      <h1 class="mt-2 font-display text-3xl font-semibold tracking-tight text-navy-900 sm:text-4xl">
        Book your free class
      </h1>
      <p class="mt-3 text-sm leading-6 text-muted">
        Book for yourself, a child, or several family members. Each person picks their own class time.
        Times are America/Denver, next {{ BOOKING_HORIZON_DAYS }} days.
      </p>
      <p
        v-if="publicTagline"
        class="mt-2 text-xs text-muted"
      >
        {{ publicTagline }}
      </p>
    </div>

    <div
      v-if="confirmation"
      class="space-y-4 rounded-lg border border-emerald-200 bg-success-50 p-5"
    >
      <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-success-700">
        You’re booked
      </p>
      <h2 class="font-display text-2xl font-semibold text-navy-900">
        {{ confirmation.people.length > 1 ? 'Your intros are scheduled' : 'Your intro is scheduled' }}
      </h2>
      <p
        v-if="confirmation.householdContactName"
        class="text-sm text-navy-800"
      >
        Household contact: {{ confirmation.householdContactName }}
      </p>
      <ul class="space-y-3">
        <li
          v-for="(person, index) in confirmation.people"
          :key="`${person.firstName}-${index}`"
        >
          <p class="font-medium text-navy-900">
            {{ [person.firstName, person.lastName].filter(Boolean).join(' ') }}
          </p>
          <p class="text-sm text-navy-800">
            {{ person.programName ? `${person.programName} — ` : '' }}{{ person.className }}
          </p>
          <p class="text-sm text-navy-800">
            {{ formatDenverLongDate(person.date) }} at {{ person.time }}
          </p>
        </li>
      </ul>
      <p class="text-sm text-muted">
        We’ll follow up using the contact information you provided. This page does not send a text or email confirmation.
      </p>
    </div>

    <form
      v-else
      class="panel space-y-5 p-5 sm:p-6"
      @submit.prevent="submit"
    >
      <AppAlert v-if="errorMessage">
        {{ errorMessage }}
      </AppAlert>

      <fieldset>
        <legend class="text-sm font-medium text-navy-900">
          Who would you like to book for?
        </legend>
        <div class="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button
            type="button"
            class="rounded-md border px-3 py-3 text-sm font-medium"
            :class="shape === 'ONE' ? 'border-navy-900 bg-navy-900 text-white' : 'border-line bg-paper text-navy-800'"
            :aria-pressed="shape === 'ONE'"
            @click="shape = 'ONE'"
          >
            One person
          </button>
          <button
            type="button"
            class="rounded-md border px-3 py-3 text-sm font-medium"
            :class="shape === 'FAMILY' ? 'border-navy-900 bg-navy-900 text-white' : 'border-line bg-paper text-navy-800'"
            :aria-pressed="shape === 'FAMILY'"
            @click="shape = 'FAMILY'"
          >
            Multiple family members
          </button>
        </div>
      </fieldset>

      <template v-if="shape">
        <div class="grid gap-4 sm:grid-cols-2">
          <AppField
            :label="shape === 'FAMILY' || oneWho === 'CHILD' ? 'Your first name' : 'First name'"
            required
          >
            <input
              v-model="form.firstName"
              required
              class="control"
              autocomplete="given-name"
            >
          </AppField>
          <AppField
            label="Last name"
            required
          >
            <input
              v-model="form.lastName"
              required
              class="control"
              autocomplete="family-name"
            >
          </AppField>
        </div>
        <AppField
          label="Phone"
          required
        >
          <input
            v-model="form.phone"
            type="tel"
            inputmode="tel"
            required
            autocomplete="tel"
            class="control"
          >
        </AppField>
        <AppField
          label="Email"
          hint="optional"
        >
          <input
            v-model="form.email"
            type="email"
            class="control"
            autocomplete="email"
          >
        </AppField>

        <template v-if="shape === 'ONE'">
          <fieldset>
            <legend class="text-sm font-medium text-navy-900">
              Who is taking the class?
            </legend>
            <div class="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                class="rounded-md border px-3 py-3 text-sm font-medium"
                :class="oneWho === 'SELF' ? 'border-navy-900 bg-navy-900 text-white' : 'border-line bg-paper text-navy-800'"
                :aria-pressed="oneWho === 'SELF'"
                @click="oneWho = 'SELF'"
              >
                Me
              </button>
              <button
                type="button"
                class="rounded-md border px-3 py-3 text-sm font-medium"
                :class="oneWho === 'CHILD' ? 'border-navy-900 bg-navy-900 text-white' : 'border-line bg-paper text-navy-800'"
                :aria-pressed="oneWho === 'CHILD'"
                @click="oneWho = 'CHILD'"
              >
                My child
              </button>
            </div>
          </fieldset>

          <div
            v-if="oneWho === 'CHILD'"
            class="grid gap-4 sm:grid-cols-2"
          >
            <AppField
              label="Child first name"
              required
            >
              <input
                :value="onePerson.firstName"
                required
                class="control"
                @input="onePerson = { ...onePerson, firstName: ($event.target as HTMLInputElement).value }"
              >
            </AppField>
            <AppField label="Child last name">
              <input
                :value="onePerson.lastName"
                class="control"
                @input="onePerson = { ...onePerson, lastName: ($event.target as HTMLInputElement).value }"
              >
            </AppField>
            <AppField label="Your relationship">
              <input
                v-model="form.guardianRelationship"
                class="control"
              >
            </AppField>
          </div>

          <TrialPersonBooking
            :model-value="onePerson"
            :show-identity="false"
            :title="oneWho === 'CHILD' ? 'Child class time' : 'Your class time'"
            @update:model-value="onePerson = $event"
          />
        </template>

        <template v-else>
          <label class="touch-row">
            <input
              v-model="contactParticipating"
              type="checkbox"
            >
            I am also participating
          </label>

          <TrialPersonBooking
            v-if="contactParticipating"
            :model-value="selfPerson"
            :show-identity="false"
            title="Your class time"
            @update:model-value="selfPerson = $event"
          />

          <div
            v-for="(person, index) in familyPeople"
            :key="person.key"
            class="space-y-2"
          >
            <div class="flex items-center justify-between gap-2">
              <p class="text-sm font-medium text-navy-900">
                Family member {{ index + 1 }}
              </p>
              <AppButton
                v-if="familyPeople.length > 1 || contactParticipating"
                variant="ghost"
                type="button"
                @click="removeFamilyPerson(person.key)"
              >
                Remove
              </AppButton>
            </div>
            <TrialPersonBooking
              :model-value="person"
              show-identity
              @update:model-value="familyPeople[index] = $event"
            />
          </div>
          <AppButton
            variant="secondary"
            type="button"
            @click="addFamilyPerson"
          >
            Add another person
          </AppButton>
        </template>

        <label class="touch-row">
          <input
            v-model="form.smsConsent"
            type="checkbox"
          >
          It’s ok to text or call me about this intro.
        </label>
        <label class="touch-row">
          <input
            v-model="form.emailConsent"
            type="checkbox"
          >
          It’s ok to email me about this intro.
        </label>
        <div
          aria-hidden="true"
          class="hidden"
        >
          <input
            v-model="form.company"
            tabindex="-1"
            autocomplete="off"
          >
        </div>
        <p
          v-if="!membersReady"
          class="text-sm text-muted"
        >
          Choose a class time to continue.
        </p>
        <AppButton
          type="submit"
          block
          :loading="pending"
          :disabled="!membersReady"
        >
          {{ pending ? 'Scheduling…' : shape === 'FAMILY' ? 'Book intros' : 'Book trial' }}
        </AppButton>
      </template>
    </form>
  </section>
</template>
