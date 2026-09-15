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
const confirmDecommission = ref(false)
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
    await refreshStatus()
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
    await refreshStatus()
    await watchUntilSettled()
  } catch (error) {
    actionNotice.value = ''
    actionError.value = fetchMessage(error, 'Add product failed.')
    await refreshStatus()
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
    await refreshStatus()
    await watchUntilSettled()
  } catch (error) {
    actionNotice.value = ''
    actionError.value = fetchMessage(error, 'Add environment failed.')
    await refreshStatus()
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
    await refreshStatus()
  } catch (error) {
    actionError.value = fetchMessage(error, 'Decommission failed.')
  } finally {
    decommissioning.value = false
  }
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
          @refresh="refreshStatus"
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
          :columns="['Product', 'PROD', 'DEV', 'Envs', 'Overall', 'Detail']"
        >
          <tr
            v-for="instance in customer?.instances"
            :key="instance.id"
          >
            <td>{{ instance.displayName }}</td>
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
            <td><AppStatusBadge :status="instance.overall || 'unknown'" /></td>
            <td class="muted">
              {{ shortProvisionError(instance.provisionError) || '—' }}
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
          :columns="['Environment', 'Product', 'Type', 'Status', 'Runtime', 'Image', 'Detail', 'Access']"
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
            <td class="muted">
              {{ shortProvisionError(env.provisionError) || '—' }}
            </td>
            <td><AppAccessLink :href="env.accessUrl" /></td>
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
          Read-only. There is no customer edit API.
        </p>
        <dl class="dl">
          <dt>Timezone</dt>
          <dd>{{ customer?.timezone }}</dd>
          <dt>Admin email</dt>
          <dd>{{ customer?.adminEmail }}</dd>
          <dt>Products</dt>
          <dd>{{ customer?.instanceCount || 0 }}</dd>
          <dt>Environments</dt>
          <dd>{{ customer?.environmentCount }}</dd>
        </dl>
        <form
          v-if="hasEnvironments && !allDecommissioned"
          class="card"
          @submit.prevent="decommissionCustomer"
        >
          <p>
            Decommission every environment for this customer. This stops and removes processes only. Volumes stay. This is not Stop. It never runs compose down -v.
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
            :aria-busy="decommissioning"
          >
            {{ decommissioning ? 'Decommissioning…' : 'Decommission customer' }}
          </button>
        </form>
        <p
          v-else-if="allDecommissioned"
          class="muted"
        >
          All environments for this customer are decommissioned. Volumes were left in place.
        </p>
        <p
          v-else
          class="muted"
        >
          This account has no environments yet.
        </p>
      </section>
    </AppAsyncPanel>
  </main>
</template>
