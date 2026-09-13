<script setup lang="ts">
definePageMeta({
  layout: 'internal',
  middleware: ['auth', 'admin'],
})

useHead({
  title: 'Proposal letterhead',
})

type Letterhead = {
  businessName: string
  address: string
  phone: string
  email: string
  website: string
  footer: string
  logoFilename: string | null
}

const { data: letterhead, error, pending, refresh } = await useFetch<Letterhead>('/api/settings/proposals')
const businessName = ref('')
const address = ref('')
const phone = ref('')
const email = ref('')
const website = ref('')
const footer = ref('')
const saving = ref(false)
const uploading = ref(false)
const notice = ref('')
const formError = ref('')
const logoInput = ref<HTMLInputElement | null>(null)
const letterheadLogoUrl = '/api/settings/proposals/logo'

watch(letterhead, (value) => {
  if (!value) {
    return
  }
  businessName.value = value.businessName
  address.value = value.address
  phone.value = value.phone
  email.value = value.email
  website.value = value.website
  footer.value = value.footer
}, { immediate: true })

async function save() {
  formError.value = ''
  notice.value = ''
  saving.value = true
  try {
    await $fetch('/api/settings/proposals', {
      method: 'PATCH',
      body: {
        businessName: businessName.value,
        address: address.value,
        phone: phone.value,
        email: email.value,
        website: website.value,
        footer: footer.value,
      },
    })
    await refresh()
    notice.value = 'Saved. This is instance configuration, not a theme CMS.'
  } catch (caught: unknown) {
    const err = caught as { data?: { message?: string } }
    formError.value = err.data?.message || 'Could not save letterhead.'
  } finally {
    saving.value = false
  }
}

async function uploadLogo(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) {
    return
  }
  uploading.value = true
  formError.value = ''
  try {
    const body = new FormData()
    body.append('file', file)
    await $fetch('/api/settings/proposals/logo', { method: 'POST', body })
    await refresh()
    notice.value = 'Logo saved. Leave it empty for a text-only Proposal.'
  } catch (caught: unknown) {
    const err = caught as { data?: { message?: string } }
    formError.value = err.data?.message || 'Could not upload logo.'
  } finally {
    uploading.value = false
    input.value = ''
  }
}

async function removeLogo() {
  uploading.value = true
  try {
    await $fetch('/api/settings/proposals/logo', { method: 'DELETE' })
    await refresh()
    notice.value = 'Logo removed. Text-only letterhead remains valid.'
  } catch (caught: unknown) {
    const err = caught as { data?: { message?: string } }
    formError.value = err.data?.message || 'Could not remove logo.'
  } finally {
    uploading.value = false
  }
}
</script>

<template>
  <section class="space-y-6">
    <AppPageHeader
      title="Proposal letterhead"
      description="Instance-configurable seller identity for Sales Proposals. Do not hardcode a customer name."
    />
    <AppAlert v-if="error || formError">
      {{ formError || 'Could not load letterhead.' }}
    </AppAlert>
    <AppAlert
      v-if="notice"
      tone="success"
    >
      {{ notice }}
    </AppAlert>
    <p
      v-if="pending && !letterhead"
      class="text-sm text-muted"
    >
      Loading…
    </p>
    <form
      v-else
      class="form-measure space-y-4"
      @submit.prevent="save"
    >
      <AppField
        label="Business / legal name"
        required
      >
        <input
          v-model="businessName"
          class="control"
          required
        >
      </AppField>
      <AppField label="Address">
        <textarea
          v-model="address"
          class="control"
          rows="3"
        />
      </AppField>
      <AppField label="Phone">
        <input
          v-model="phone"
          class="control"
        >
      </AppField>
      <AppField label="Email">
        <input
          v-model="email"
          class="control"
        >
      </AppField>
      <AppField label="Website">
        <input
          v-model="website"
          class="control"
        >
      </AppField>
      <AppField
        label="Default terms / legal footer"
        hint="Copied onto new Drafts. Staff may override per Proposal."
      >
        <textarea
          v-model="footer"
          class="control"
          rows="5"
        />
      </AppField>
      <div class="space-y-2">
        <p class="text-sm font-medium">
          Optional logo
        </p>
        <img
          v-if="letterhead?.logoFilename"
          :src="letterheadLogoUrl"
          alt="Letterhead logo"
          class="h-12 w-auto"
        >
        <p
          v-else
          class="text-sm text-muted"
        >
          No logo. Text-only Proposals are valid.
        </p>
        <input
          ref="logoInput"
          class="text-sm"
          type="file"
          accept="image/png,image/jpeg"
          @change="uploadLogo"
        >
        <AppButton
          v-if="letterhead?.logoFilename"
          variant="subtle"
          :loading="uploading"
          @click="removeLogo"
        >
          Remove logo
        </AppButton>
      </div>
      <AppButton
        type="submit"
        :loading="saving"
      >
        Save letterhead
      </AppButton>
    </form>
  </section>
</template>
