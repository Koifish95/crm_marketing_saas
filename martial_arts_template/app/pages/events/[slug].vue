<script setup lang="ts">
import { attributionFromQuery, capturePublicAttribution } from '#shared/utils/public-attribution'
import { toBusinessDateTime } from '#shared/utils/time'

definePageMeta({
  layout: 'default',
})

const route = useRoute()
const slug = computed(() => String(route.params.slug || ''))

interface PublicSession {
  id: number
  name: string
  startsAt: string | Date
  remaining: number | null
  minAge: number | null
  maxAge: number | null
}

interface PublicQuestion {
  id: number
  prompt: string
  fieldType: 'SHORT_TEXT' | 'YES_NO' | 'SINGLE_CHOICE'
  required: boolean
  options: string[]
}

interface PublicEvent {
  id: number
  title: string
  description: string | null
  registrationManuallyClosed: boolean
  sessions: PublicSession[]
  questions: PublicQuestion[]
}

useHead({
  title: 'Event registration',
})

const { data: event, error } = await useFetch<PublicEvent>(() => `/api/public/events/${slug.value}`)
const pending = ref(false)
const errorMessage = ref('')
const confirmation = ref('')

const attribution = ref(attributionFromQuery(route.query))
if (import.meta.client) {
  attribution.value = capturePublicAttribution(route.query)
}

let personSeq = 0
function nextKey() {
  personSeq += 1
  return `person-${personSeq}`
}

const contact = reactive({
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  company: '',
})
const people = ref<Array<{ key: string, firstName: string, lastName: string, age: string, sessionId: string }>>([
  { key: nextKey(), firstName: '', lastName: '', age: '', sessionId: '' },
])
const answers = reactive<Record<number, string>>({})

function addPerson() {
  people.value.push({ key: nextKey(), firstName: '', lastName: '', age: '', sessionId: '' })
}

function removePerson(key: string) {
  people.value = people.value.filter(person => person.key !== key)
  if (!people.value.length) {
    addPerson()
  }
}

async function submit() {
  if (pending.value || !event.value) {
    return
  }
  pending.value = true
  errorMessage.value = ''
  try {
    await $fetch(`/api/public/events/${slug.value}`, {
      method: 'POST',
      body: {
        firstName: contact.firstName,
        lastName: contact.lastName,
        phone: contact.phone,
        email: contact.email,
        company: contact.company,
        participants: people.value
          .filter(person => person.firstName.trim() && person.sessionId)
          .map(person => ({
            firstName: person.firstName,
            lastName: person.lastName || undefined,
            age: person.age ? Number(person.age) : undefined,
            sessionId: Number(person.sessionId),
          })),
        answers: (event.value.questions ?? []).map(question => ({
          questionId: question.id,
          value: answers[question.id] || '',
        })).filter(item => item.value),
        ...attribution.value,
      },
    })
    confirmation.value = `You're registered for ${event.value.title}. We'll follow up after the event.`
  } catch (caught) {
    const err = caught as { data?: { message?: string }, message?: string }
    errorMessage.value = err.data?.message || err.message || 'Could not complete registration.'
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <section class="mx-auto max-w-2xl space-y-6">
    <AppAlert v-if="error">
      This event is not available.
    </AppAlert>
    <template v-else-if="event">
      <header>
        <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
          Renzo Gracie Kaysville
        </p>
        <h1 class="font-display text-3xl font-semibold text-navy-900">
          {{ event.title }}
        </h1>
        <p
          v-if="event.description"
          class="mt-2 text-muted"
        >
          {{ event.description }}
        </p>
      </header>

      <p
        v-if="confirmation"
        class="panel p-5 text-navy-900"
      >
        {{ confirmation }}
      </p>

      <form
        v-else
        class="space-y-6"
        @submit.prevent="submit"
      >
        <AppAlert v-if="errorMessage">
          {{ errorMessage }}
        </AppAlert>
        <p
          v-if="event.registrationManuallyClosed"
          class="text-sm text-muted"
        >
          Registration is closed.
        </p>
        <fieldset class="panel grid gap-3 p-5">
          <legend class="font-medium text-navy-900">
            Primary contact / household
          </legend>
          <AppField
            label="First name"
            required
          >
            <input
              v-model="contact.firstName"
              class="control"
              required
              autocomplete="given-name"
            >
          </AppField>
          <AppField
            label="Last name"
            required
          >
            <input
              v-model="contact.lastName"
              class="control"
              required
              autocomplete="family-name"
            >
          </AppField>
          <AppField
            label="Phone"
            required
          >
            <input
              v-model="contact.phone"
              type="tel"
              inputmode="tel"
              autocomplete="tel"
              class="control"
              required
            >
          </AppField>
          <AppField label="Email">
            <input
              v-model="contact.email"
              type="email"
              autocomplete="email"
              class="control"
            >
          </AppField>
          <input
            v-model="contact.company"
            class="hidden"
            tabindex="-1"
            autocomplete="off"
          >
        </fieldset>

        <fieldset
          v-for="(person, index) in people"
          :key="person.key"
          class="panel grid gap-3 p-5"
        >
          <legend class="font-medium text-navy-900">
            Participant {{ index + 1 }}
          </legend>
          <AppField
            label="First name"
            required
          >
            <input
              v-model="person.firstName"
              class="control"
              required
            >
          </AppField>
          <AppField label="Last name">
            <input
              v-model="person.lastName"
              class="control"
            >
          </AppField>
          <AppField label="Age">
            <input
              v-model="person.age"
              type="number"
              min="0"
              inputmode="numeric"
              class="control"
            >
          </AppField>
          <AppField
            label="Session"
            required
          >
            <select
              v-model="person.sessionId"
              class="control"
              required
            >
              <option value="">
                Choose a session
              </option>
              <option
                v-for="session in event.sessions"
                :key="session.id"
                :value="session.id"
                :disabled="session.remaining === 0"
              >
                {{ session.name }} · {{ toBusinessDateTime(new Date(session.startsAt).getTime()) }}
                <template v-if="session.remaining != null">
                  ({{ session.remaining }} left)
                </template>
              </option>
            </select>
          </AppField>
          <div v-if="people.length > 1">
            <AppButton
              type="button"
              variant="ghost"
              @click="removePerson(person.key)"
            >
              Remove participant
            </AppButton>
          </div>
        </fieldset>
        <AppButton
          type="button"
          variant="secondary"
          @click="addPerson"
        >
          Add another participant
        </AppButton>

        <fieldset
          v-if="event.questions.length"
          class="panel grid gap-3 p-5"
        >
          <legend class="font-medium text-navy-900">
            A few questions
          </legend>
          <AppField
            v-for="question in event.questions"
            :key="question.id"
            :label="question.prompt"
            :required="question.required"
          >
            <select
              v-if="question.fieldType === 'YES_NO'"
              v-model="answers[question.id]"
              class="control"
              :required="question.required"
            >
              <option value="">
                Choose
              </option>
              <option value="yes">
                Yes
              </option>
              <option value="no">
                No
              </option>
            </select>
            <select
              v-else-if="question.fieldType === 'SINGLE_CHOICE'"
              v-model="answers[question.id]"
              class="control"
              :required="question.required"
            >
              <option value="">
                Choose
              </option>
              <option
                v-for="option in question.options"
                :key="option"
                :value="option"
              >
                {{ option }}
              </option>
            </select>
            <input
              v-else
              v-model="answers[question.id]"
              class="control"
              :required="question.required"
            >
          </AppField>
        </fieldset>

        <AppButton
          type="submit"
          block
          :disabled="pending"
        >
          {{ pending ? 'Submitting…' : 'Register' }}
        </AppButton>
      </form>
    </template>
  </section>
</template>
