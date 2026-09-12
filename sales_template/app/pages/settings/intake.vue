<script setup lang="ts">
definePageMeta({
  layout: 'internal',
  middleware: ['auth', 'admin'],
})

useHead({
  title: 'Public intake',
})

type Field = {
  id: string
  label: string
  visible: boolean
  required: boolean
  order: number
  helpText: string
}
type Config = {
  enabled: boolean
  introText: string
  helpText: string
  submitLabel: string
  thankYouText: string
  unavailableText: string
  fields: Field[]
}

const { data: config, error, pending, refresh } = await useFetch<Config>('/api/settings/intake')
const enabled = ref(false)
const introText = ref('')
const helpText = ref('')
const submitLabel = ref('')
const thankYouText = ref('')
const unavailableText = ref('')
const fields = ref<Field[]>([])
const saving = ref(false)
const notice = ref('')
const formError = ref('')

watch(config, (value) => {
  if (!value) {
    return
  }
  enabled.value = value.enabled
  introText.value = value.introText
  helpText.value = value.helpText
  submitLabel.value = value.submitLabel
  thankYouText.value = value.thankYouText
  unavailableText.value = value.unavailableText
  fields.value = value.fields.map(field => ({ ...field }))
}, { immediate: true })

async function save() {
  formError.value = ''
  notice.value = ''
  saving.value = true
  try {
    await $fetch('/api/settings/intake', {
      method: 'PATCH',
      body: {
        enabled: enabled.value,
        introText: introText.value,
        helpText: helpText.value,
        submitLabel: submitLabel.value,
        thankYouText: thankYouText.value,
        unavailableText: unavailableText.value,
        fields: fields.value,
      },
    })
    await refresh()
    notice.value = 'Saved. First name, last name, and email stay required.'
  } catch (caught: unknown) {
    const err = caught as { data?: { message?: string } }
    formError.value = err.data?.message || 'Could not save intake settings.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <section class="space-y-6">
    <AppPageHeader
      title="Public intake"
      description="Configuration-driven inquiry form. Closed field catalog. Not a customer-facing form builder."
    />
    <AppAlert v-if="error || formError">
      {{ formError || 'Could not load intake settings.' }}
    </AppAlert>
    <AppAlert
      v-if="notice"
      tone="success"
    >
      {{ notice }}
    </AppAlert>
    <p
      v-if="pending && !config"
      class="text-sm text-muted"
    >
      Loading…
    </p>
    <form
      v-else
      class="form-measure space-y-4"
      @submit.prevent="save"
    >
      <label class="touch-row">
        <input
          v-model="enabled"
          type="checkbox"
        >
        Accept public submissions
      </label>
      <AppField label="Intro text">
        <textarea
          v-model="introText"
          class="control"
          rows="2"
        />
      </AppField>
      <AppField label="Help text">
        <textarea
          v-model="helpText"
          class="control"
          rows="2"
        />
      </AppField>
      <AppField label="Submit button">
        <input
          v-model="submitLabel"
          class="control"
        >
      </AppField>
      <AppField label="Thank-you copy">
        <textarea
          v-model="thankYouText"
          class="control"
          rows="2"
        />
      </AppField>
      <AppField label="Unavailable copy">
        <textarea
          v-model="unavailableText"
          class="control"
          rows="2"
        />
      </AppField>
      <div
        v-for="field in fields"
        :key="field.id"
        class="rounded-md border border-line p-3 space-y-2"
      >
        <p class="text-sm font-medium">
          {{ field.id }}
        </p>
        <AppField label="Label">
          <input
            v-model="field.label"
            class="control"
          >
        </AppField>
        <AppField label="Order">
          <input
            v-model.number="field.order"
            class="control"
            type="number"
          >
        </AppField>
        <AppField label="Help">
          <input
            v-model="field.helpText"
            class="control"
          >
        </AppField>
        <label class="touch-row">
          <input
            v-model="field.visible"
            type="checkbox"
          >
          Visible
        </label>
        <label class="touch-row">
          <input
            v-model="field.required"
            type="checkbox"
            :disabled="['firstName', 'lastName', 'email'].includes(field.id)"
          >
          Required
        </label>
      </div>
      <AppButton
        type="submit"
        :loading="saving"
      >
        Save configuration
      </AppButton>
    </form>
  </section>
</template>
