<script setup lang="ts">
import { demoRequestSchema } from '~~/shared/demo-request'

const route = useRoute()
const submitted = ref(false)
const pending = ref(false)
const formError = ref('')
const fieldErrors = ref<Record<string, string>>({})

const form = reactive({
  name: '',
  academy: '',
  email: '',
  phone: '',
})

function attribution() {
  const query = route.query
  const pick = (key: string) => {
    const value = query[key]
    return typeof value === 'string' ? value : undefined
  }
  return {
    utm_source: pick('utm_source'),
    utm_medium: pick('utm_medium'),
    utm_campaign: pick('utm_campaign'),
    utm_content: pick('utm_content'),
    utm_term: pick('utm_term'),
    referrer: import.meta.client ? document.referrer || undefined : undefined,
    landing_page: import.meta.client ? window.location.pathname + window.location.search : route.fullPath,
  }
}

async function onSubmit() {
  formError.value = ''
  fieldErrors.value = {}
  const parsed = demoRequestSchema.safeParse({
    ...form,
    attribution: attribution(),
  })
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] || 'form')
      if (!fieldErrors.value[key]) fieldErrors.value[key] = issue.message
    }
    return
  }
  pending.value = true
  try {
    await $fetch('/api/demo-request', {
      method: 'POST',
      body: parsed.data,
    })
    submitted.value = true
  } catch {
    formError.value = 'The request could not be sent. Check the fields and try again.'
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <div>
    <div
      v-if="submitted"
      class="border border-line bg-paper p-6"
      role="status"
    >
      <h2 class="font-display text-2xl font-semibold text-navy-900">
        Request received.
      </h2>
      <p class="mt-3 text-base leading-7 text-muted">
        We'll review your information and contact you to arrange a walkthrough.
      </p>
    </div>
    <form
      v-else
      class="grid gap-4"
      novalidate
      @submit.prevent="onSubmit"
    >
      <div>
        <label
          class="block text-sm font-semibold text-navy-900"
          for="demo-name"
        >Name</label>
        <input
          id="demo-name"
          v-model="form.name"
          name="name"
          autocomplete="name"
          required
          class="mt-1 min-h-11 w-full rounded-md border border-line bg-paper px-3 text-base"
        >
        <p
          v-if="fieldErrors.name"
          class="mt-1 text-sm text-brand-700"
        >
          {{ fieldErrors.name }}
        </p>
      </div>
      <div>
        <label
          class="block text-sm font-semibold text-navy-900"
          for="demo-academy"
        >Academy</label>
        <input
          id="demo-academy"
          v-model="form.academy"
          name="academy"
          autocomplete="organization"
          required
          class="mt-1 min-h-11 w-full rounded-md border border-line bg-paper px-3 text-base"
        >
        <p
          v-if="fieldErrors.academy"
          class="mt-1 text-sm text-brand-700"
        >
          {{ fieldErrors.academy }}
        </p>
      </div>
      <div>
        <label
          class="block text-sm font-semibold text-navy-900"
          for="demo-email"
        >Email</label>
        <input
          id="demo-email"
          v-model="form.email"
          name="email"
          type="email"
          autocomplete="email"
          required
          class="mt-1 min-h-11 w-full rounded-md border border-line bg-paper px-3 text-base"
        >
        <p
          v-if="fieldErrors.email"
          class="mt-1 text-sm text-brand-700"
        >
          {{ fieldErrors.email }}
        </p>
      </div>
      <div>
        <label
          class="block text-sm font-semibold text-navy-900"
          for="demo-phone"
        >Phone</label>
        <input
          id="demo-phone"
          v-model="form.phone"
          name="phone"
          type="tel"
          autocomplete="tel"
          required
          class="mt-1 min-h-11 w-full rounded-md border border-line bg-paper px-3 text-base"
        >
        <p
          v-if="fieldErrors.phone"
          class="mt-1 text-sm text-brand-700"
        >
          {{ fieldErrors.phone }}
        </p>
      </div>
      <p
        v-if="formError"
        class="text-sm text-brand-700"
        role="alert"
      >
        {{ formError }}
      </p>
      <div>
        <PrimaryButton
          type="submit"
          :disabled="pending"
        >
          {{ pending ? 'Sending…' : 'Request a Demo' }}
        </PrimaryButton>
      </div>
    </form>
  </div>
</template>
