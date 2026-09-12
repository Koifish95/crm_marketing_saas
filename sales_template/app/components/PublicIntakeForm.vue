<script setup lang="ts">
type IntakeField = {
  id: string
  label: string
  required: boolean
  order: number
  helpText: string
}

type IntakePresentation = {
  enabled: boolean
  introText: string
  helpText: string
  submitLabel: string
  thankYouText: string
  unavailableText: string
  honeypotField: string
  fields: IntakeField[]
}

const props = defineProps<{
  token?: string
}>()

const runtime = useRuntimeConfig()
const brandName = computed(() => String(runtime.public.brandName || runtime.public.appName || 'Inquiry'))
const tagline = computed(() => String(runtime.public.publicTagline || ''))

const { data: untracked, error: untrackedError, pending: untrackedPending } = await useFetch<IntakePresentation>(
  '/api/public/intake',
  { immediate: !props.token },
)
const { data: tracked, error: trackedError, pending: trackedPending } = await useFetch<{ token: string, intake: IntakePresentation }>(
  () => `/api/public/tracking/${encodeURIComponent(props.token || '')}`,
  { immediate: Boolean(props.token) },
)

const intake = computed(() => props.token ? tracked.value?.intake : untracked.value)
const loadError = computed(() => props.token ? trackedError.value : untrackedError.value)
const pending = computed(() => props.token ? trackedPending.value : untrackedPending.value)

if (props.token && trackedError.value) {
  throw createError({
    statusCode: 404,
    statusMessage: 'That link is not available.',
    fatal: true,
  })
}

const values = reactive<Record<string, string>>({})
const honeypot = ref('')
const submitting = ref(false)
const submitted = ref(false)
const thankYou = ref('')
const formError = ref('')
const idempotencyKey = useState(`sales-intake-key-${props.token || 'direct'}`, () => crypto.randomUUID())

watch(intake, (config) => {
  if (!config) {
    return
  }
  for (const field of config.fields) {
    if (values[field.id] == null) {
      values[field.id] = ''
    }
  }
}, { immediate: true })

useHead({
  title: computed(() => brandName.value),
})

const fieldType = (id: string) => {
  if (id === 'email') {
    return 'email'
  }
  if (id === 'phone') {
    return 'tel'
  }
  return 'text'
}

async function submit() {
  formError.value = ''
  submitting.value = true
  try {
    const result = await $fetch<{ thankYouText: string }>('/api/public/intake', {
      method: 'POST',
      body: {
        token: props.token,
        idempotencyKey: idempotencyKey.value,
        website: honeypot.value,
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        phone: values.phone,
        companyName: values.companyName,
        message: values.message,
      },
    })
    thankYou.value = result.thankYouText
    submitted.value = true
  } catch (caught: unknown) {
    const err = caught as { data?: { message?: string }, statusCode?: number }
    formError.value = err.data?.message || 'Could not submit that inquiry.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <section class="mx-auto max-w-lg space-y-6 px-4">
    <header class="space-y-2">
      <p class="text-sm font-medium uppercase tracking-wide text-muted">
        {{ brandName }}
      </p>
      <h1 class="font-display text-3xl font-semibold text-navy-900">
        Inquire
      </h1>
      <p
        v-if="tagline"
        class="text-sm text-muted"
      >
        {{ tagline }}
      </p>
    </header>
    <p
      v-if="pending && !intake"
      class="text-sm text-muted"
    >
      Loading…
    </p>
    <AppAlert v-else-if="loadError">
      That link is not available.
    </AppAlert>
    <AppAlert
      v-else-if="intake && !intake.enabled"
      tone="info"
    >
      {{ intake.unavailableText }}
    </AppAlert>
    <AppAlert
      v-else-if="submitted"
      tone="success"
    >
      {{ thankYou }}
    </AppAlert>
    <form
      v-else-if="intake"
      class="space-y-4"
      @submit.prevent="submit"
    >
      <p
        v-if="intake.introText"
        class="text-sm text-muted"
      >
        {{ intake.introText }}
      </p>
      <p
        v-if="intake.helpText"
        class="text-sm text-muted"
      >
        {{ intake.helpText }}
      </p>
      <AppAlert v-if="formError">
        {{ formError }}
      </AppAlert>
      <div
        class="absolute -left-[9999px] h-0 w-0 overflow-hidden"
        aria-hidden="true"
      >
        <label>
          Website
          <input
            v-model="honeypot"
            tabindex="-1"
            autocomplete="off"
          >
        </label>
      </div>
      <AppField
        v-for="field in intake.fields"
        :key="field.id"
        :label="field.label"
        :required="field.required"
        :hint="field.helpText || undefined"
      >
        <textarea
          v-if="field.id === 'message'"
          v-model="values[field.id]"
          class="control"
          rows="4"
          :required="field.required"
        />
        <input
          v-else
          v-model="values[field.id]"
          class="control"
          :type="fieldType(field.id)"
          :required="field.required"
          :autocomplete="field.id === 'email' ? 'email' : field.id === 'phone' ? 'tel' : 'on'"
        >
      </AppField>
      <AppButton
        type="submit"
        :loading="submitting"
        block
      >
        {{ intake.submitLabel }}
      </AppButton>
    </form>
  </section>
</template>
