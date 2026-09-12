<script setup lang="ts">
import { OFFER_PRICING_TYPES, offerPricingTypeLabel } from '#shared/utils/catalog'

definePageMeta({
  layout: 'internal',
  middleware: ['auth', 'sales'],
})

const route = useRoute()
const id = computed(() => Number(route.params.id))

type Offer = {
  id: number
  name: string
  description: string | null
  pricingType: string
  defaultUnitPriceCents: number
  active: boolean
}

const { data: offer, error, pending, refresh } = await useFetch<Offer>(() => `/api/offers/${id.value}`)
useHead({
  title: computed(() => offer.value?.name || 'Offer'),
})

const name = ref('')
const description = ref('')
const pricingType = ref('one_time')
const price = ref('')
const active = ref(true)
const saving = ref(false)
const notice = ref('')
const formError = ref('')

watch(offer, (value) => {
  if (!value) {
    return
  }
  name.value = value.name
  description.value = value.description || ''
  pricingType.value = value.pricingType
  price.value = String(value.defaultUnitPriceCents / 100)
  active.value = value.active
}, { immediate: true })

async function save() {
  formError.value = ''
  notice.value = ''
  saving.value = true
  try {
    await $fetch(`/api/offers/${id.value}`, {
      method: 'PATCH',
      body: {
        name: name.value,
        description: description.value,
        pricingType: pricingType.value,
        defaultUnitPriceCents: Math.round(Number(price.value || '0') * 100),
        active: active.value,
      },
    })
    await refresh()
    notice.value = 'Saved. Existing Opportunity lines keep their quoted prices.'
  } catch (caught: unknown) {
    const err = caught as { data?: { message?: string } }
    formError.value = err.data?.message || 'Could not save.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <AppRecordWorkspace :loading="pending && !offer">
    <template #header>
      <p class="record-kind">
        Offer
      </p>
      <h1 class="record-identity-name">
        {{ offer?.name || 'Offer' }}
      </h1>
      <p class="record-meta">
        {{ offer ? offerPricingTypeLabel(offer.pricingType) : '' }}
      </p>
    </template>
    <AppAlert v-if="error || formError">
      {{ formError || 'Could not load this offer.' }}
    </AppAlert>
    <AppAlert
      v-if="notice"
      tone="success"
    >
      {{ notice }}
    </AppAlert>
    <form
      v-if="offer"
      class="form-measure space-y-4"
      @submit.prevent="save"
    >
      <AppField
        label="Name"
        required
      >
        <input
          v-model="name"
          class="control"
          required
        >
      </AppField>
      <AppField label="Description">
        <textarea
          v-model="description"
          class="control"
          rows="3"
        />
      </AppField>
      <AppField label="Pricing type">
        <select
          v-model="pricingType"
          class="control"
        >
          <option
            v-for="type in OFFER_PRICING_TYPES"
            :key="type"
            :value="type"
          >
            {{ offerPricingTypeLabel(type) }}
          </option>
        </select>
      </AppField>
      <AppField
        label="Default unit price (USD)"
        required
      >
        <input
          v-model="price"
          class="control"
          inputmode="decimal"
          required
        >
      </AppField>
      <label class="touch-row">
        <input
          v-model="active"
          type="checkbox"
        >
        Active
      </label>
      <AppButton
        type="submit"
        :loading="saving"
      >
        Save
      </AppButton>
    </form>
  </AppRecordWorkspace>
</template>
