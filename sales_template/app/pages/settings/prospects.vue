<script setup lang="ts">
import type { PublicProspectDeskConfig } from '#shared/utils/prospect-desk'

definePageMeta({
  layout: 'internal',
  middleware: ['auth', 'admin'],
})

useHead({
  title: 'Prospect desk',
})

const { data: config, error, refresh } = await useFetch<PublicProspectDeskConfig>('/api/settings/prospects')
const form = ref<PublicProspectDeskConfig | null>(null)
const password = ref('')
const saving = ref(false)
const notice = ref('')
const formError = ref('')

watch(config, (value) => {
  if (!value) {
    return
  }
  form.value = {
    ...value,
    practiceStates: [...value.practiceStates],
    templates: value.templates.map(template => ({ ...template })) as PublicProspectDeskConfig['templates'],
  }
}, { immediate: true })

async function save() {
  if (!form.value) {
    return
  }
  formError.value = ''
  notice.value = ''
  saving.value = true
  try {
    await $fetch('/api/settings/prospects', {
      method: 'PATCH',
      body: {
        ...form.value,
        mailboxPassword: password.value,
      },
    })
    password.value = ''
    await refresh()
    notice.value = 'Prospect desk saved.'
  } catch (caught: unknown) {
    const err = caught as { data?: { message?: string } }
    formError.value = err.data?.message || 'Could not save the prospect desk.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <section class="space-y-6">
    <AppPageHeader
      title="Prospect desk"
      description="One mailbox, three messages, and a hard daily cap. Utah and the states around it stay out of the practice list."
    />
    <AppAlert v-if="error || formError">
      {{ formError || 'Could not load prospect settings.' }}
    </AppAlert>
    <AppAlert
      v-if="notice"
      tone="success"
    >
      {{ notice }}
    </AppAlert>
    <form
      v-if="form"
      class="space-y-6"
      @submit.prevent="save"
    >
      <AppPanel title="Desk">
        <label class="flex items-center gap-2 text-sm">
          <input
            v-model="form.enabled"
            type="checkbox"
          >
          Prospects is on for this Sales instance
        </label>
        <p class="mt-3 text-sm text-muted">
          Practice states: {{ form.practiceStates.join(', ') }}
        </p>
      </AppPanel>
      <AppPanel title="Pace">
        <div class="grid gap-3 sm:grid-cols-3">
          <AppField label="Daily cap">
            <input
              v-model.number="form.dailyCap"
              class="control"
              type="number"
              min="1"
              max="50"
            >
          </AppField>
          <AppField label="Window starts (Denver hour)">
            <input
              v-model.number="form.sendStartHour"
              class="control"
              type="number"
              min="0"
              max="23"
            >
          </AppField>
          <AppField label="Window ends">
            <input
              v-model.number="form.sendEndHour"
              class="control"
              type="number"
              min="1"
              max="24"
            >
          </AppField>
          <AppField label="Minutes between sends">
            <input
              v-model.number="form.minutesBetweenSends"
              class="control"
              type="number"
              min="1"
            >
          </AppField>
          <AppField label="Second touch after days">
            <input
              v-model.number="form.secondTouchDays"
              class="control"
              type="number"
              min="1"
            >
          </AppField>
          <AppField label="Last touch after days">
            <input
              v-model.number="form.thirdTouchDays"
              class="control"
              type="number"
              min="2"
            >
          </AppField>
          <AppField label="Pause after this many bounces today">
            <input
              v-model.number="form.bouncePauseLine"
              class="control"
              type="number"
              min="1"
            >
          </AppField>
        </div>
      </AppPanel>
      <AppPanel title="Messages">
        <div class="grid gap-3">
          <AppField label="From name">
            <input
              v-model="form.fromName"
              class="control"
            >
          </AppField>
          <AppField label="Postal address">
            <textarea
              v-model="form.postalAddress"
              class="control"
              rows="2"
            />
          </AppField>
          <AppField label="Unsubscribe line">
            <input
              v-model="form.unsubscribeLine"
              class="control"
            >
          </AppField>
          <AppField label="Public base URL for open tracking">
            <input
              v-model="form.publicBaseUrl"
              class="control"
              placeholder="Leave empty on this laptop"
            >
          </AppField>
          <template
            v-for="(template, index) in form.templates"
            :key="index"
          >
            <AppField :label="`Touch ${index + 1} subject`">
              <input
                v-model="template.subject"
                class="control"
              >
            </AppField>
            <AppField :label="`Touch ${index + 1} body`">
              <textarea
                v-model="template.body"
                class="control"
                rows="5"
              />
            </AppField>
          </template>
          <p class="text-sm text-muted">
            Placeholders: &#123;&#123;academy&#125;&#125;, &#123;&#123;city&#125;&#125;, &#123;&#123;address&#125;&#125;, &#123;&#123;unsubscribe&#125;&#125;. An open never sends the next touch.
          </p>
        </div>
      </AppPanel>
      <AppPanel title="Mailbox">
        <div class="grid gap-3 sm:grid-cols-2">
          <AppField label="SMTP host">
            <input
              v-model="form.smtpHost"
              class="control"
            >
          </AppField>
          <AppField label="SMTP port">
            <input
              v-model.number="form.smtpPort"
              class="control"
              type="number"
            >
          </AppField>
          <label class="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              v-model="form.smtpSecure"
              type="checkbox"
            >
            SMTP uses implicit TLS
          </label>
          <AppField label="IMAP host">
            <input
              v-model="form.imapHost"
              class="control"
            >
          </AppField>
          <AppField label="IMAP port">
            <input
              v-model.number="form.imapPort"
              class="control"
              type="number"
            >
          </AppField>
          <AppField label="Mailbox username">
            <input
              v-model="form.mailboxUsername"
              class="control"
            >
          </AppField>
          <AppField :label="form.passwordSet ? 'New mailbox password' : 'Mailbox password'">
            <input
              v-model="password"
              class="control"
              type="password"
              autocomplete="new-password"
            >
          </AppField>
        </div>
        <p class="mt-3 text-sm text-muted">
          {{ form.passwordSet ? 'A password is saved. Leave this blank to keep it.' : 'No password is saved yet.' }}
        </p>
      </AppPanel>
      <AppButton
        type="submit"
        :loading="saving"
      >
        Save prospect desk
      </AppButton>
    </form>
  </section>
</template>
