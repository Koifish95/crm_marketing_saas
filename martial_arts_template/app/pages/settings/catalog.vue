<script setup lang="ts">
import { centsToDollarString, dollarsToCents } from '#shared/utils/money'

definePageMeta({
  layout: 'internal',
  middleware: ['auth', 'admin'],
})

useHead({
  title: 'Catalog',
})

interface ProgramRow {
  id: number
  code: string
  name: string
  active: boolean
  seasonal: boolean
}

interface NamedRow {
  id: number
  code: string
  name: string
  active: boolean
  sortOrder: number
}

interface OfferingRow {
  id: number
  name: string
  programId: number
  monthlyCents: number
  enrollmentCents: number
  description: string | null
  active: boolean
  sortOrder: number
  program?: { name: string, code: string }
}

interface PricingRow {
  id: number
  programId: number
  firstMonthlyCents: number
  additionalMonthlyCents: number
  active: boolean
  program?: { name: string, code: string }
}

const errorMessage = ref('')

const { data: programs, refresh: refreshPrograms } = await useFetch<ProgramRow[]>('/api/programs')
const { data: sources, refresh: refreshSources } = await useFetch<NamedRow[]>('/api/lead-sources', {
  query: { includeInactive: 'true' },
})
const { data: lostReasons, refresh: refreshLostReasons } = await useFetch<NamedRow[]>('/api/lost-reasons', {
  query: { includeInactive: 'true' },
})
const { data: offerings, refresh: refreshOfferings } = await useFetch<OfferingRow[]>('/api/membership-offerings', {
  query: { includeInactive: 'true' },
})
const { data: pricingRules, refresh: refreshPricing } = await useFetch<PricingRow[]>('/api/household-pricing-rules')

const programForm = reactive({
  name: '',
  code: '',
  active: true,
  seasonal: false,
})

const sourceForm = reactive({
  name: '',
  code: '',
  sortOrder: '80',
  active: true,
})

const lostForm = reactive({
  name: '',
  code: '',
  sortOrder: '90',
  active: true,
})

const offeringForm = reactive({
  name: '',
  programId: '',
  monthly: '175.00',
  enrollment: '0.00',
  description: '',
  active: true,
})

const pricingForm = reactive({
  programId: '',
  first: '175.00',
  additional: '155.00',
  active: true,
})

function apiError(caught: unknown, fallback: string) {
  const err = caught as { data?: { message?: string }, message?: string }
  return err.data?.message || err.message || fallback
}

async function saveProgram(program?: ProgramRow) {
  errorMessage.value = ''
  try {
    if (program) {
      await $fetch(`/api/admin/programs/${program.id}`, {
        method: 'PATCH',
        body: { name: program.name, active: program.active, seasonal: program.seasonal },
      })
    } else {
      await $fetch('/api/admin/programs', {
        method: 'POST',
        body: {
          name: programForm.name,
          code: programForm.code,
          active: programForm.active,
          seasonal: programForm.seasonal,
        },
      })
      programForm.name = ''
      programForm.code = ''
    }
    await refreshPrograms()
  } catch (caught) {
    errorMessage.value = apiError(caught, 'Could not save that program.')
  }
}

async function saveSource(row?: NamedRow) {
  errorMessage.value = ''
  try {
    if (row) {
      await $fetch(`/api/admin/lead-sources/${row.id}`, {
        method: 'PATCH',
        body: { code: row.code, name: row.name, active: row.active, sortOrder: row.sortOrder },
      })
    } else {
      await $fetch('/api/admin/lead-sources', {
        method: 'POST',
        body: {
          code: sourceForm.code,
          name: sourceForm.name,
          active: sourceForm.active,
          sortOrder: Number(sourceForm.sortOrder) || 0,
        },
      })
      sourceForm.name = ''
      sourceForm.code = ''
    }
    await refreshSources()
  } catch (caught) {
    errorMessage.value = apiError(caught, 'Could not save that source.')
  }
}

async function saveLostReason(row?: NamedRow) {
  errorMessage.value = ''
  try {
    if (row) {
      await $fetch(`/api/admin/lost-reasons/${row.id}`, {
        method: 'PATCH',
        body: { code: row.code, name: row.name, active: row.active, sortOrder: row.sortOrder },
      })
    } else {
      await $fetch('/api/admin/lost-reasons', {
        method: 'POST',
        body: {
          code: lostForm.code,
          name: lostForm.name,
          active: lostForm.active,
          sortOrder: Number(lostForm.sortOrder) || 0,
        },
      })
      lostForm.name = ''
      lostForm.code = ''
    }
    await refreshLostReasons()
  } catch (caught) {
    errorMessage.value = apiError(caught, 'Could not save that lost reason.')
  }
}

async function saveOffering(row?: OfferingRow) {
  errorMessage.value = ''
  try {
    if (row) {
      await $fetch(`/api/admin/membership-offerings/${row.id}`, {
        method: 'PATCH',
        body: {
          name: row.name,
          programId: row.programId,
          monthlyCents: row.monthlyCents,
          enrollmentCents: row.enrollmentCents,
          description: row.description,
          active: row.active,
          sortOrder: row.sortOrder,
        },
      })
    } else {
      await $fetch('/api/admin/membership-offerings', {
        method: 'POST',
        body: {
          name: offeringForm.name,
          programId: Number(offeringForm.programId),
          monthlyCents: dollarsToCents(offeringForm.monthly),
          enrollmentCents: dollarsToCents(offeringForm.enrollment || '0'),
          description: offeringForm.description || null,
          active: offeringForm.active,
        },
      })
      offeringForm.name = ''
      offeringForm.description = ''
    }
    await refreshOfferings()
  } catch (caught) {
    errorMessage.value = apiError(caught, 'Could not save that offering.')
  }
}

async function savePricing(row?: PricingRow) {
  errorMessage.value = ''
  try {
    if (row) {
      await $fetch(`/api/admin/household-pricing-rules/${row.id}`, {
        method: 'PATCH',
        body: {
          programId: row.programId,
          firstMonthlyCents: row.firstMonthlyCents,
          additionalMonthlyCents: row.additionalMonthlyCents,
          active: row.active,
        },
      })
    } else {
      await $fetch('/api/admin/household-pricing-rules', {
        method: 'POST',
        body: {
          programId: Number(pricingForm.programId),
          firstMonthlyCents: dollarsToCents(pricingForm.first),
          additionalMonthlyCents: dollarsToCents(pricingForm.additional),
          active: pricingForm.active,
        },
      })
      pricingForm.programId = ''
    }
    await refreshPricing()
  } catch (caught) {
    errorMessage.value = apiError(caught, 'Could not save that household price.')
  }
}

async function saveOfferingDollars(row: OfferingRow, monthly: string, enrollment: string) {
  try {
    row.monthlyCents = dollarsToCents(monthly)
    row.enrollmentCents = dollarsToCents(enrollment || '0')
    await saveOffering(row)
  } catch (caught) {
    errorMessage.value = apiError(caught, 'Use amounts like 175.00.')
  }
}

async function savePricingDollars(row: PricingRow, first: string, additional: string) {
  try {
    row.firstMonthlyCents = dollarsToCents(first)
    row.additionalMonthlyCents = dollarsToCents(additional)
    await savePricing(row)
  } catch (caught) {
    errorMessage.value = apiError(caught, 'Use amounts like 175.00.')
  }
}
</script>

<template>
  <section class="space-y-8">
    <AppPageHeader
      title="Catalog"
      description="Programs, lead sources, membership offerings, lost reasons, and household pricing. Amounts are forecasted acquisition value in USD, not cash collected."
    />

    <AppAlert v-if="errorMessage">
      {{ errorMessage }}
    </AppAlert>

    <AppPanel
      title="Programs"
      description="Inactive programs stay on history but should not be used for new work."
    >
      <ul class="panel-list divide-y divide-line text-sm">
        <li
          v-for="program in programs ?? []"
          :key="program.id"
          class="flex flex-wrap items-end gap-3 py-3"
        >
          <AppField
            class="min-w-40 flex-1"
            label="Name"
          >
            <input
              v-model="program.name"
              class="control"
            >
          </AppField>
          <label class="touch-row">
            <input
              v-model="program.active"
              type="checkbox"
            >
            Active
          </label>
          <label class="touch-row">
            <input
              v-model="program.seasonal"
              type="checkbox"
            >
            Seasonal
          </label>
          <AppButton
            variant="subtle"
            @click="saveProgram(program)"
          >
            Save
          </AppButton>
        </li>
      </ul>
      <form
        class="mt-4 grid gap-3 sm:grid-cols-2"
        @submit.prevent="saveProgram()"
      >
        <AppField
          label="New program name"
          required
        >
          <input
            v-model="programForm.name"
            class="control"
            required
          >
        </AppField>
        <AppField
          label="Code"
          hint="Stable id"
          required
        >
          <input
            v-model="programForm.code"
            class="control"
            required
          >
        </AppField>
        <div class="flex items-end">
          <AppButton type="submit">
            Add program
          </AppButton>
        </div>
      </form>
    </AppPanel>

    <AppPanel
      title="Lead sources"
      description="Staff still pick a source on the inquiry. This list is the ADMIN-managed catalog."
    >
      <ul class="panel-list divide-y divide-line text-sm">
        <li
          v-for="source in sources ?? []"
          :key="source.id"
          class="flex flex-wrap items-end gap-3 py-3"
        >
          <AppField
            class="min-w-40 flex-1"
            :label="source.code"
          >
            <input
              v-model="source.name"
              class="control"
            >
          </AppField>
          <label class="touch-row">
            <input
              v-model="source.active"
              type="checkbox"
            >
            Active
          </label>
          <AppButton
            variant="subtle"
            @click="saveSource(source)"
          >
            Save
          </AppButton>
        </li>
      </ul>
      <form
        class="mt-4 grid gap-3 sm:grid-cols-3"
        @submit.prevent="saveSource()"
      >
        <AppField
          label="Name"
          required
        >
          <input
            v-model="sourceForm.name"
            class="control"
            required
          >
        </AppField>
        <AppField
          label="Code"
          required
        >
          <input
            v-model="sourceForm.code"
            class="control"
            required
          >
        </AppField>
        <div class="flex items-end">
          <AppButton type="submit">
            Add source
          </AppButton>
        </div>
      </form>
    </AppPanel>

    <AppPanel
      title="Lost reasons"
      description="Required when a prospective member is marked lost."
    >
      <ul class="panel-list divide-y divide-line text-sm">
        <li
          v-for="reason in lostReasons ?? []"
          :key="reason.id"
          class="flex flex-wrap items-end gap-3 py-3"
        >
          <AppField
            class="min-w-40 flex-1"
            :label="reason.code"
          >
            <input
              v-model="reason.name"
              class="control"
            >
          </AppField>
          <label class="touch-row">
            <input
              v-model="reason.active"
              type="checkbox"
            >
            Active
          </label>
          <AppButton
            variant="subtle"
            @click="saveLostReason(reason)"
          >
            Save
          </AppButton>
        </li>
      </ul>
      <form
        class="mt-4 grid gap-3 sm:grid-cols-3"
        @submit.prevent="saveLostReason()"
      >
        <AppField
          label="Name"
          required
        >
          <input
            v-model="lostForm.name"
            class="control"
            required
          >
        </AppField>
        <AppField
          label="Code"
          required
        >
          <input
            v-model="lostForm.code"
            class="control"
            required
          >
        </AppField>
        <div class="flex items-end">
          <AppButton type="submit">
            Add reason
          </AppButton>
        </div>
      </form>
    </AppPanel>

    <AppPanel
      title="Membership offerings"
      description="Inactive offerings stay on history and forecasts already assigned to a person, but are not selectable for new conversions."
    >
      <ul class="panel-list divide-y divide-line text-sm">
        <li
          v-for="offering in offerings ?? []"
          :key="offering.id"
          class="grid gap-3 py-3 lg:grid-cols-6"
        >
          <AppField
            class="lg:col-span-2"
            label="Name"
          >
            <input
              v-model="offering.name"
              class="control"
            >
          </AppField>
          <AppField label="Monthly">
            <input
              :value="centsToDollarString(offering.monthlyCents)"
              class="control"
              inputmode="decimal"
              @change="saveOfferingDollars(offering, ($event.target as HTMLInputElement).value, centsToDollarString(offering.enrollmentCents))"
            >
          </AppField>
          <AppField label="Enrollment">
            <input
              :value="centsToDollarString(offering.enrollmentCents)"
              class="control"
              inputmode="decimal"
              @change="saveOfferingDollars(offering, centsToDollarString(offering.monthlyCents), ($event.target as HTMLInputElement).value)"
            >
          </AppField>
          <label class="touch-row self-end">
            <input
              v-model="offering.active"
              type="checkbox"
              @change="saveOffering(offering)"
            >
            Active
          </label>
          <div class="flex items-end">
            <AppButton
              variant="subtle"
              @click="saveOffering(offering)"
            >
              Save
            </AppButton>
          </div>
        </li>
      </ul>
      <form
        class="mt-4 grid gap-3 sm:grid-cols-2"
        @submit.prevent="saveOffering()"
      >
        <AppField
          label="Name"
          required
        >
          <input
            v-model="offeringForm.name"
            class="control"
            required
          >
        </AppField>
        <AppField
          label="Program"
          required
        >
          <select
            v-model="offeringForm.programId"
            class="control"
            required
          >
            <option value="">
              Select
            </option>
            <option
              v-for="program in programs ?? []"
              :key="program.id"
              :value="String(program.id)"
            >
              {{ program.name }}
            </option>
          </select>
        </AppField>
        <AppField
          label="Monthly USD"
          required
        >
          <input
            v-model="offeringForm.monthly"
            class="control"
            required
          >
        </AppField>
        <AppField label="Enrollment USD">
          <input
            v-model="offeringForm.enrollment"
            class="control"
          >
        </AppField>
        <div class="sm:col-span-2 flex items-end">
          <AppButton type="submit">
            Add offering
          </AppButton>
        </div>
      </form>
    </AppPanel>

    <AppPanel
      title="Household pricing"
      description="First applicable member in a program uses the first price; each additional uses the additional price. Line overrides replace that person’s monthly amount."
    >
      <ul class="panel-list divide-y divide-line text-sm">
        <li
          v-for="rule in pricingRules ?? []"
          :key="rule.id"
          class="grid gap-3 py-3 lg:grid-cols-5"
        >
          <p class="self-end font-medium text-navy-900">
            {{ rule.program?.name || 'Program' }}
          </p>
          <AppField label="First member">
            <input
              :value="centsToDollarString(rule.firstMonthlyCents)"
              class="control"
              @change="savePricingDollars(rule, ($event.target as HTMLInputElement).value, centsToDollarString(rule.additionalMonthlyCents))"
            >
          </AppField>
          <AppField label="Each additional">
            <input
              :value="centsToDollarString(rule.additionalMonthlyCents)"
              class="control"
              @change="savePricingDollars(rule, centsToDollarString(rule.firstMonthlyCents), ($event.target as HTMLInputElement).value)"
            >
          </AppField>
          <label class="touch-row self-end">
            <input
              v-model="rule.active"
              type="checkbox"
              @change="savePricing(rule)"
            >
            Active
          </label>
          <div class="flex items-end">
            <AppButton
              variant="subtle"
              @click="savePricing(rule)"
            >
              Save
            </AppButton>
          </div>
        </li>
      </ul>
      <form
        class="mt-4 grid gap-3 sm:grid-cols-3"
        @submit.prevent="savePricing()"
      >
        <AppField
          label="Program"
          required
        >
          <select
            v-model="pricingForm.programId"
            class="control"
            required
          >
            <option value="">
              Select
            </option>
            <option
              v-for="program in programs ?? []"
              :key="program.id"
              :value="String(program.id)"
            >
              {{ program.name }}
            </option>
          </select>
        </AppField>
        <AppField
          label="First member USD"
          required
        >
          <input
            v-model="pricingForm.first"
            class="control"
            required
          >
        </AppField>
        <AppField
          label="Additional USD"
          required
        >
          <input
            v-model="pricingForm.additional"
            class="control"
            required
          >
        </AppField>
        <div class="sm:col-span-3">
          <AppButton type="submit">
            Add household rule
          </AppButton>
        </div>
      </form>
    </AppPanel>
  </section>
</template>
