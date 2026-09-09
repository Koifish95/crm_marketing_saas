<script setup lang="ts">
import { centsToDollarString } from '#shared/utils/money'
import { toBusinessDateTime } from '#shared/utils/time'

definePageMeta({
  layout: 'internal',
  middleware: ['auth', 'marketing'],
})

useHead({
  title: 'Compensation',
})

interface LedgerRow {
  id: number
  amountCents: number
  monthlyCents: number
  basisBps: number
  offeringName: string | null
  paymentStatus: 'UNPAID' | 'PAID'
  paidAt: string | Date | null
  earnedAt: string | Date
  creditedUser?: { displayName: string } | null
  leadLine?: { id: number, firstName: string, lastName: string | null, leadId: number } | null
}

const { data: me } = await useFetch<{ user?: { role: string }, accessRights?: string[] }>('/api/auth/me')
const canManage = computed(() => me.value?.user?.role === 'ADMIN' || Boolean(me.value?.accessRights?.includes('MANAGE_COMPENSATION_ATTRIBUTION')))
const errorMessage = ref('')
const { data: rows, refresh, error } = await useFetch<LedgerRow[]>('/api/marketing/compensation')

function apiError(caught: unknown, fallback: string) {
  const err = caught as { data?: { message?: string }, message?: string }
  return err.data?.message || err.message || fallback
}

async function markPaid(id: number) {
  errorMessage.value = ''
  try {
    await $fetch(`/api/marketing/compensation/earned/${id}/paid`, { method: 'POST', body: {} })
    await refresh()
  } catch (caught) {
    errorMessage.value = apiError(caught, 'Could not mark that entry paid.')
  }
}
</script>

<template>
  <section class="space-y-6">
    <AppPageHeader
      eyebrow="Marketing"
      title="Compensation ledger"
      description="Earned compensation snapshots at Joined. Later catalog or campaign edits do not change these amounts. This is not accounting."
    />
    <AppAlert v-if="error">
      You need Marketing Reports access to view this ledger.
    </AppAlert>
    <AppAlert v-if="errorMessage">
      {{ errorMessage }}
    </AppAlert>
    <AppPanel
      v-if="!(rows ?? []).length"
      title="No earned compensation yet"
      description="Compensation is snapshotted when a credited prospective member joins."
    />
    <div
      v-else
      class="space-y-3 md:hidden"
    >
      <div
        v-for="row in rows ?? []"
        :key="row.id"
        class="panel p-4"
      >
        <p class="font-medium text-navy-900">
          <NuxtLink
            v-if="row.leadLine"
            :to="`/leads/${row.leadLine.leadId}`"
          >
            {{ row.leadLine.firstName }} {{ row.leadLine.lastName }}
          </NuxtLink>
        </p>
        <p class="mt-1 text-sm text-muted">
          {{ row.creditedUser?.displayName }} · ${{ centsToDollarString(row.amountCents) }}
        </p>
        <p class="mt-1 text-sm">
          {{ row.paymentStatus === 'PAID' ? 'Paid' : 'Unpaid' }}
        </p>
        <AppButton
          v-if="canManage && row.paymentStatus === 'UNPAID'"
          class="mt-3"
          variant="secondary"
          @click="markPaid(row.id)"
        >
          Mark paid
        </AppButton>
      </div>
    </div>
    <div
      v-if="(rows ?? []).length"
      class="panel hidden overflow-x-auto md:block"
    >
      <table class="data-table">
        <thead>
          <tr>
            <th>Earned</th>
            <th>Owner</th>
            <th>Member</th>
            <th>Offering snapshot</th>
            <th>Amount</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in rows ?? []"
            :key="row.id"
          >
            <td>{{ toBusinessDateTime(new Date(row.earnedAt).getTime()) }}</td>
            <td>{{ row.creditedUser?.displayName }}</td>
            <td>
              <NuxtLink
                v-if="row.leadLine"
                :to="`/leads/${row.leadLine.leadId}`"
              >
                {{ row.leadLine.firstName }} {{ row.leadLine.lastName }}
              </NuxtLink>
            </td>
            <td>
              {{ row.offeringName || 'Custom' }}
              · ${{ centsToDollarString(row.monthlyCents) }}/mo
              · {{ row.basisBps / 100 }}%
            </td>
            <td>${{ centsToDollarString(row.amountCents) }}</td>
            <td>
              {{ row.paymentStatus === 'PAID' ? 'Paid' : 'Unpaid' }}
              <AppButton
                v-if="canManage && row.paymentStatus === 'UNPAID'"
                class="ml-2"
                variant="secondary"
                @click="markPaid(row.id)"
              >
                Mark paid
              </AppButton>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
