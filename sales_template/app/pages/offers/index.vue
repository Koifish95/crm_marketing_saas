<script setup lang="ts">
import { OFFER_PRICING_TYPES, offerPricingTypeLabel } from '#shared/utils/catalog'
import { formatUsdFromCents } from '#shared/utils/money'

definePageMeta({
  layout: 'internal',
  middleware: ['auth', 'sales'],
})

useHead({
  title: 'Offers',
})

type Offer = {
  id: number
  name: string
  description: string | null
  pricingType: string
  defaultUnitPriceCents: number
  active: boolean
}

const name = ref('')
const pricingType = ref('one_time')
const price = ref('')
const errorMessage = ref('')
const saving = ref(false)
const { data: offers, error, pending, refresh } = await useFetch<Offer[]>('/api/offers')

async function create() {
  errorMessage.value = ''
  saving.value = true
  try {
    const created = await $fetch<Offer>('/api/offers', {
      method: 'POST',
      body: {
        name: name.value,
        pricingType: pricingType.value,
        defaultUnitPriceCents: Math.round(Number(price.value || '0') * 100),
      },
    })
    name.value = ''
    price.value = ''
    await refresh()
    await navigateTo(`/offers/${created.id}`)
  } catch (caught: unknown) {
    const err = caught as { data?: { message?: string } }
    errorMessage.value = err.data?.message || 'Could not create that offer.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <section class="space-y-6">
    <AppPageHeader
      title="Offers"
      description="Defaults for quoting. Offer edits do not rewrite existing Opportunity lines."
    />
    <AppAlert v-if="error || errorMessage">
      {{ errorMessage || 'Could not load offers.' }}
    </AppAlert>
    <AppPanel title="New offer">
      <form
        class="grid gap-3 sm:grid-cols-3"
        @submit.prevent="create"
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
        <AppField label="Type">
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
          label="Default price (USD)"
          required
        >
          <input
            v-model="price"
            class="control"
            inputmode="decimal"
            required
          >
        </AppField>
        <div class="sm:col-span-3">
          <AppButton
            type="submit"
            :loading="saving"
          >
            Create offer
          </AppButton>
        </div>
      </form>
    </AppPanel>
    <AppEmpty
      v-if="!pending && !offers?.length"
      title="No offers yet"
    />
    <ul
      v-else
      class="record-list"
    >
      <li
        v-for="offer in offers"
        :key="offer.id"
        class="record-item"
      >
        <NuxtLink
          :to="`/offers/${offer.id}`"
          class="record-item-title"
        >
          {{ offer.name }}
        </NuxtLink>
        <p class="record-item-meta">
          {{ offerPricingTypeLabel(offer.pricingType) }}
          · {{ formatUsdFromCents(offer.defaultUnitPriceCents) }}
          · {{ offer.active ? 'Active' : 'Inactive' }}
        </p>
      </li>
    </ul>
  </section>
</template>
