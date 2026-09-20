<script setup lang="ts">
import {
  FLEET_PROVISION_POLL_ATTEMPTS,
  FLEET_PROVISION_POLL_MS,
  findById,
  operatorEnvironmentStatus,
  pollFleetUntilHealthy,
  shortProvisionError,
} from '~~/shared/utils/fleet'
import { CUSTOMER_TABS } from '~~/shared/utils/nav'
import {
  DEFAULT_EXTRA_ENVIRONMENT_FORM,
  DEFAULT_PRODUCT_INSTANCE_FORM,
  EXTRA_ENV_TYPES,
  customerIsProvisioning,
  customerNeedsRetry,
  extraEnvironmentRequestBody,
  productInstanceRequestBody,
} from '~~/shared/utils/provision'

const route = useRoute()
const { error, pending, refreshing, summary, checkedAt, refreshStatus } = await useFleetStatus()
const tab = ref('overview')
const customerId = computed(() => String(route.params.id || ''))
const customer = computed(() => findById(summary.value.customers, customerId.value))
const adding = ref(false)
const addingProduct = ref(false)
const retrying = ref(false)
const decommissioning = ref(false)
const deactivating = ref(false)
const reactivating = ref(false)
const instanceBusy = ref('')
const confirmDecommission = ref(false)
const confirmDeactivate = ref(false)
const deactivateNote = ref('')
const actionError = ref('')
const actionNotice = ref('')
const watchingProvision = ref(false)
const extra = reactive({ ...DEFAULT_EXTRA_ENVIRONMENT_FORM })
const productForm = reactive({ ...DEFAULT_PRODUCT_INSTANCE_FORM })
const catalog = await useFetch<{ products: { id: string, displayName: string }[] }>('/api/products')
const availableProducts = computed(() => {
  const taken = new Set((customer.value?.instances || []).map(instance => instance.productId))
  return (catalog.data.value?.products || []).filter(product => !taken.has(product.id))
})
const hasEnvironments = computed(() => Boolean(customer.value?.environments.length))
const allDecommissioned = computed(() => (
  hasEnvironments.value
  && !!customer.value?.environments.every(env => env.lifecycleStatus === 'decommissioned')
))
const canRetry = computed(() => customerNeedsRetry(customer.value?.environments ?? []))
const provisioning = computed(() => customerIsProvisioning(customer.value?.environments ?? []))

watch(() => customer.value?.instances, (instances) => {
  if (!extra.productInstanceId && instances?.[0]) {
    extra.productInstanceId = instances[0].id
  }
}, { immediate: true })

async function watchUntilSettled() {
  if (watchingProvision.value || !provisioning.value) {
    return
  }
  watchingProvision.value = true
  try {
    const outcome = await pollFleetUntilHealthy({
      isHealthy: () => !customerIsProvisioning(customer.value?.environments ?? []),
      refresh: refreshStatus,
      attempts: FLEET_PROVISION_POLL_ATTEMPTS,
      delayMs: FLEET_PROVISION_POLL_MS,
    })
    if (outcome === 'timeout' && customerIsProvisioning(customer.value?.environments ?? [])) {
      actionNotice.value = 'Still provisioning. Image build can take several minutes. Refresh this page; Retry remains available if it stays Provisioning or becomes Failed.'
      return
    }
    const failed = customer.value?.environments.find(env => env.lifecycleStatus === 'failed')
    if (failed) {
      actionNotice.value = ''
      actionError.value = failed.provisionError || 'Provisioning failed. Use Retry to continue the same environments.'
      return
    }
    if (actionNotice.value.startsWith('Accepted') || actionNotice.value.startsWith('Retry accepted')) {
      actionNotice.value = 'Provisioning finished.'
    }
  } finally {
    watchingProvision.value = false
  }
}

watch(provisioning, (active) => {
  if (active) {
    void watchUntilSettled()
  }
}, { immediate: true })

async function retryProvision() {
  if (!customer.value) {
    return
  }
  retrying.value = true
  actionError.value = ''
  actionNotice.value = 'Retry accepted. Continuing the existing environments. Same volumes. Image build can take several minutes.'
  try {
    await $fetch(`/api/customers/${customer.value.id}/provision`, { method: 'POST' })
    await refreshWorkspace()
    await watchUntilSettled()
  } catch (error) {
    actionNotice.value = ''
    actionError.value = fetchMessage(error, 'Retry failed.')
  } finally {
    retrying.value = false
  }
}

async function addProduct() {
  if (!customer.value) {
    return
  }
  addingProduct.value = true
  actionError.value = ''
  actionNotice.value = 'Accepted. Creating the product instance and starting provision. Image build can take several minutes. You can leave this page.'
  try {
    await $fetch(`/api/customers/${customer.value.id}/product-instances`, {
      method: 'POST',
      body: productInstanceRequestBody(productForm),
    })
    productForm.productId = ''
    await refreshWorkspace()
    await watchUntilSettled()
  } catch (error) {
    actionNotice.value = ''
    actionError.value = fetchMessage(error, 'Add product failed.')
    await refreshWorkspace()
  } finally {
    addingProduct.value = false
  }
}

async function addExtra() {
  if (!customer.value) {
    return
  }
  adding.value = true
  actionError.value = ''
  actionNotice.value = 'Accepted. Provisioning the extra environment.'
  try {
    await $fetch(`/api/customers/${customer.value.id}/environments`, {
      method: 'POST',
      body: extraEnvironmentRequestBody(extra),
    })
    extra.displayName = ''
    await refreshWorkspace()
    await watchUntilSettled()
  } catch (error) {
    actionNotice.value = ''
    actionError.value = fetchMessage(error, 'Add environment failed.')
    await refreshWorkspace()
  } finally {
    adding.value = false
  }
}

async function decommissionCustomer() {
  if (!customer.value || !confirmDecommission.value) {
    return
  }
  decommissioning.value = true
  actionError.value = ''
  actionNotice.value = ''
  try {
    await $fetch(`/api/customers/${customer.value.id}/decommission`, { method: 'POST' })
    await refreshWorkspace()
  } catch (error) {
    actionError.value = fetchMessage(error, 'Decommission failed.')
  } finally {
    decommissioning.value = false
  }
}

async function deactivateThisCustomer() {
  if (!customer.value || !confirmDeactivate.value) {
    return
  }
  deactivating.value = true
  actionError.value = ''
  try {
    await $fetch(`/api/customers/${customer.value.id}/deactivate`, {
      method: 'POST',
      body: { note: deactivateNote.value },
    })
    confirmDeactivate.value = false
    await refreshWorkspace()
    actionNotice.value = 'Customer is inactive. Running environments were stopped. Data remains.'
  } catch (error) {
    actionError.value = fetchMessage(error, 'Deactivate failed.')
  } finally {
    deactivating.value = false
  }
}

async function reactivateThisCustomer() {
  if (!customer.value) {
    return
  }
  reactivating.value = true
  actionError.value = ''
  try {
    await $fetch(`/api/customers/${customer.value.id}/reactivate`, { method: 'POST' })
    await refreshWorkspace()
    actionNotice.value = 'Customer is active again. Product instances are active. Start environments from each environment workspace.'
  } catch (error) {
    actionError.value = fetchMessage(error, 'Reactivate failed.')
  } finally {
    reactivating.value = false
  }
}

async function setInstanceStatus(id: string, action: 'deactivate' | 'reactivate') {
  instanceBusy.value = id
  actionError.value = ''
  try {
    await $fetch(`/api/product-instances/${id}/${action}`, { method: 'POST' })
    await refreshWorkspace()
  } catch (error) {
    actionError.value = fetchMessage(error, `${action} failed.`)
  } finally {
    instanceBusy.value = ''
  }
}

const { data: history, refresh: refreshHistory } = await useFetch<{ events: { id: string, createdAt: string, action: string, summary: string }[] }>(
  () => `/api/events?customerId=${customerId.value}&limit=40`,
)

async function refreshWorkspace() {
  await Promise.all([refreshStatus(), refreshHistory()])
}

useHead({ title: computed(() => customer.value ? `Customer · ${customer.value.displayName}` : 'Customer') })
</script>

<template>
  <main class="page">
    <AppPageHeader
      :title="customer?.displayName || 'Customer'"
      :crumbs="[{ to: '/customers', label: 'Customers' }, { label: customer?.displayName || 'Record' }]"
    >
      <template #actions>
        <AppRefreshButton
          :pending="pending"
          :refreshing="refreshing"
          @refresh="refreshWorkspace"
        />
        <button
          v-if="canRetry"
          type="button"
          :disabled="retrying || !customer"
          :aria-busy="retrying"
          @click="retryProvision"
        >
          {{ retrying ? 'Retrying…' : 'Retry' }}
        </button>
      </template>
      Last checked {{ checkedAt || '—' }}.
      <template v-if="provisioning">
        Provisioning in progress. Status is stored on the server. You can leave this page.
      </template>
      <template v-else-if="canRetry">
        Retry continues the existing environments and remounts the same volumes. It does not delete volumes.
      </template>
    </AppPageHeader>
    <p
      v-if="actionError"
      class="action-error"
      role="status"
      aria-live="polite"
    >
      {{ actionError }}
    </p>
    <p
      v-else-if="actionNotice"
      class="action-status"
      role="status"
      aria-live="polite"
    >
      {{ actionNotice }}
    </p>
    <AppAsyncPanel
      :pending="pending && !customer"
      :error="error || (!pending && !customer)"
      error-message="Customer not found in the current registry."
    >
      <AppWorkspaceTabs
        v-model="tab"
        :tabs="[...CUSTOMER_TABS]"
      />
      <section
        v-if="tab === 'overview'"
        id="panel-overview"
        role="tabpanel"
        aria-labelledby="tab-overview"
      >
        <dl class="dl">
          <dt>Customer ID</dt>
          <dd>{{ customer?.id }}</dd>
          <dt>Slug</dt>
          <dd>{{ customer?.slug }}</dd>
          <dt>Products</dt>
          <dd>{{ customer?.instanceCount || 0 }}</dd>
          <dt>Overall</dt>
          <dd><AppStatusBadge :status="customer?.overall || 'unknown'" /></dd>
          <dt>Lifecycle</dt>
          <dd><AppStatusBadge :status="customer?.status || 'active'" /></dd>
          <dt>Hosting node</dt>
          <dd>{{ customer?.environments[0]?.node.name || '—' }}</dd>
        </dl>
      </section>
      <section
        v-else-if="tab === 'products'"
        id="panel-products"
        role="tabpanel"
        aria-labelledby="tab-products"
      >
        <form
          v-if="availableProducts.length"
          class="card"
          @submit.prevent="addProduct"
        >
          <p>
            Select a product. This creates a product instance with PROD and DEV, then provisions them in the background. Creating the account did not choose a product.
          </p>
          <label>
            Product
            <select
              v-model="productForm.productId"
              required
            >
              <option
                disabled
                value=""
              >
                Select product
              </option>
              <option
                v-for="product in availableProducts"
                :key="product.id"
                :value="product.id"
              >
                {{ product.displayName }}
              </option>
            </select>
          </label>
          <button
            type="submit"
            :disabled="addingProduct || !productForm.productId || !customer"
            :aria-busy="addingProduct"
          >
            {{ addingProduct ? 'Starting…' : 'Add product instance' }}
          </button>
        </form>
        <p
          v-else
          class="muted"
        >
          Martial Arts and Sales are already on this account.
        </p>
        <AppDataTable
          label="Product instances"
          :columns="['Product', 'Lifecycle', 'PROD', 'DEV', 'Envs', 'Detail', 'Actions']"
        >
          <tr
            v-for="instance in customer?.instances"
            :key="instance.id"
          >
            <td>{{ instance.displayName }}</td>
            <td><AppStatusBadge :status="instance.status || 'active'" /></td>
            <td>
              <AppStatusBadge
                v-if="instance.prod"
                :status="operatorEnvironmentStatus(instance.prod)"
              />
              <span
                v-else
                class="muted"
              >—</span>
            </td>
            <td>
              <AppStatusBadge
                v-if="instance.dev"
                :status="operatorEnvironmentStatus(instance.dev)"
              />
              <span
                v-else
                class="muted"
              >—</span>
            </td>
            <td>{{ instance.environmentCount }}</td>
            <td class="muted">
              {{ shortProvisionError(instance.provisionError) || '—' }}
            </td>
            <td>
              <button
                v-if="(instance.status || 'active') !== 'inactive'"
                type="button"
                class="secondary"
                :disabled="instanceBusy === instance.id"
                @click="setInstanceStatus(instance.id, 'deactivate')"
              >
                Deactivate
              </button>
              <button
                v-else
                type="button"
                :disabled="instanceBusy === instance.id || (customer?.status === 'inactive')"
                @click="setInstanceStatus(instance.id, 'reactivate')"
              >
                Reactivate
              </button>
            </td>
          </tr>
        </AppDataTable>
      </section>
      <section
        v-else-if="tab === 'environments'"
        id="panel-environments"
        role="tabpanel"
        aria-labelledby="tab-environments"
      >
        <form
          v-if="customer?.instances?.length"
          class="card"
          @submit.prevent="addExtra"
        >
          <p>
            Add one extra non-PROD on a product instance. A second PROD on the same instance is refused.
          </p>
          <label>
            Product instance
            <select
              v-model="extra.productInstanceId"
              required
            >
              <option
                v-for="instance in customer?.instances"
                :key="instance.id"
                :value="instance.id"
              >
                {{ instance.displayName }}
              </option>
            </select>
          </label>
          <label>
            Type
            <select v-model="extra.type">
              <option
                v-for="type in EXTRA_ENV_TYPES"
                :key="type"
                :value="type"
              >
                {{ type }}
              </option>
            </select>
          </label>
          <label>
            Display name
            <input
              v-model="extra.displayName"
              required
              placeholder="DEV-JOHN or STAGE"
            >
          </label>
          <button
            type="submit"
            :disabled="adding || !customer || !extra.productInstanceId"
            :aria-busy="adding"
          >
            {{ adding ? 'Starting…' : 'Add environment' }}
          </button>
        </form>
        <p
          v-else
          class="muted"
        >
          Add a product instance first. Extra environments attach to a product, not the account.
        </p>
        <AppDataTable
          label="Customer environments"
          :columns="['Environment', 'Product', 'Type', 'Status', 'Runtime', 'Image', 'Release', 'Detail', 'Access']"
        >
          <tr
            v-for="env in customer?.environments"
            :key="env.id"
          >
            <td>
              <NuxtLink :to="`/environments/${env.id}`">
                {{ env.displayName }}
              </NuxtLink>
            </td>
            <td>{{ env.productInstance?.displayName || '—' }}</td>
            <td>{{ env.type }}</td>
            <td><AppStatusBadge :status="operatorEnvironmentStatus(env)" /></td>
            <td>{{ env.runtime }}</td>
            <td>{{ env.expectedImage }}</td>
            <td>{{ env.releaseId || '—' }}</td>
            <td class="muted">
              {{ shortProvisionError(env.provisionError) || '—' }}
            </td>
            <td><AppAccessLink :href="env.accessUrl" /></td>
          </tr>
        </AppDataTable>
      </section>
      <section
        v-else-if="tab === 'history'"
        id="panel-history"
        role="tabpanel"
        aria-labelledby="tab-history"
      >
        <p
          v-if="!history?.events?.length"
          class="muted"
        >
          No events recorded for this customer yet.
        </p>
        <AppDataTable
          v-else
          label="Customer history"
          :columns="['When', 'Action', 'Summary']"
        >
          <tr
            v-for="event in history.events"
            :key="event.id"
          >
            <td>{{ event.createdAt }}</td>
            <td>{{ event.action }}</td>
            <td>{{ event.summary }}</td>
          </tr>
        </AppDataTable>
      </section>
      <section
        v-else
        id="panel-configuration"
        role="tabpanel"
        aria-labelledby="tab-configuration"
      >
        <p class="muted">
          Read-only identity. Cancellation uses Deactivate, not Delete. Permanent customer deletion is not implemented.
        </p>
        <dl class="dl">
          <dt>Timezone</dt>
          <dd>{{ customer?.timezone }}</dd>
          <dt>Admin email</dt>
          <dd>{{ customer?.adminEmail }}</dd>
          <dt>Lifecycle</dt>
          <dd><AppStatusBadge :status="customer?.status || 'active'" /></dd>
          <dt>Deactivated</dt>
          <dd>{{ customer?.deactivatedAt || '—' }}</dd>
        </dl>
        <form
          v-if="(customer?.status || 'active') !== 'inactive'"
          class="card"
          @submit.prevent="deactivateThisCustomer"
        >
          <p>
            Deactivate keeps this account and all environment records. Running processes are stopped. This is not Decommission and not Archive & Delete.
          </p>
          <label>
            Note
            <input
              v-model="deactivateNote"
              placeholder="Optional reason"
            >
          </label>
          <label>
            <input
              v-model="confirmDeactivate"
              type="checkbox"
            >
            I understand the customer becomes inactive and environments are stopped.
          </label>
          <button
            type="submit"
            class="secondary"
            :disabled="!confirmDeactivate || deactivating || !customer"
          >
            {{ deactivating ? 'Deactivating…' : 'Deactivate customer' }}
          </button>
        </form>
        <div
          v-else
          class="card"
        >
          <p>This customer is inactive. Product instances stay in history. Start environments only after reactivate.</p>
          <button
            type="button"
            :disabled="reactivating"
            @click="reactivateThisCustomer"
          >
            {{ reactivating ? 'Reactivating…' : 'Reactivate customer' }}
          </button>
        </div>
        <form
          v-if="hasEnvironments && !allDecommissioned"
          class="card"
          @submit.prevent="decommissionCustomer"
        >
          <p>
            Decommission every remaining live environment for this customer. Processes go away. Volumes stay. This is not Archive & Delete.
          </p>
          <label>
            <input
              v-model="confirmDecommission"
              type="checkbox"
            >
            I understand volumes stay and data is not deleted.
          </label>
          <button
            type="submit"
            class="secondary"
            :disabled="!confirmDecommission || decommissioning || !customer"
          >
            {{ decommissioning ? 'Decommissioning…' : 'Decommission all environments' }}
          </button>
        </form>
      </section>
    </AppAsyncPanel>
  </main>
</template>
