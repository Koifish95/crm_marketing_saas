<script setup lang="ts">
import { ACCESS_RIGHT_DESCRIPTIONS, ACCESS_RIGHT_LABELS } from '#shared/utils/access-rights'
import type { AccessRight } from '#shared/schemas/enums'

definePageMeta({
  layout: 'internal',
  middleware: ['auth', 'admin'],
})

useHead({
  title: 'Access',
})

interface CatalogRole {
  id: number
  code: string
  name: string
  description: string | null
  accessRights: AccessRight[]
}

interface CatalogType {
  id: number
  code: string
  name: string
  coarseRole: string
  description: string | null
  userRoleIds: number[]
}

interface Catalog {
  accessRights: AccessRight[]
  userTypes: CatalogType[]
  userRoles: CatalogRole[]
}

const errorMessage = ref('')
const notice = ref('')
const pendingTypeId = ref<number | null>(null)
const pendingRoleId = ref<number | null>(null)

const { data: catalog, error, refresh } = await useFetch<Catalog>('/api/admin/access')

function apiError(caught: unknown, fallback: string) {
  const err = caught as { data?: { message?: string }, message?: string }
  return err.data?.message || err.message || fallback
}

async function saveTypeRoles(type: CatalogType, userRoleIds: number[]) {
  errorMessage.value = ''
  notice.value = ''
  pendingTypeId.value = type.id
  try {
    await $fetch(`/api/admin/access/types/${type.id}`, {
      method: 'PATCH',
      body: { userRoleIds },
    })
    notice.value = `Saved roles for ${type.name}.`
    await refresh()
  } catch (caught) {
    errorMessage.value = apiError(caught, 'Could not save User Type roles.')
  } finally {
    pendingTypeId.value = null
  }
}

function toggleTypeRole(type: CatalogType, roleId: number) {
  const next = type.userRoleIds.includes(roleId)
    ? type.userRoleIds.filter(id => id !== roleId)
    : [...type.userRoleIds, roleId]
  return saveTypeRoles(type, next)
}

async function saveRoleRights(role: CatalogRole, accessRights: AccessRight[]) {
  errorMessage.value = ''
  notice.value = ''
  pendingRoleId.value = role.id
  try {
    await $fetch(`/api/admin/access/roles/${role.id}`, {
      method: 'PATCH',
      body: { accessRights },
    })
    notice.value = `Saved Access Rights for ${role.name}.`
    await refresh()
  } catch (caught) {
    errorMessage.value = apiError(caught, 'Could not save User Role Access Rights.')
  } finally {
    pendingRoleId.value = null
  }
}

function toggleRoleRight(role: CatalogRole, right: AccessRight) {
  const next = role.accessRights.includes(right)
    ? role.accessRights.filter(item => item !== right)
    : [...role.accessRights, right]
  return saveRoleRights(role, next)
}
</script>

<template>
  <section class="space-y-6">
    <AppPageHeader
      eyebrow="Settings"
      title="Access"
      description="User Types contain User Roles. User Roles grant Access Rights. Administrators always keep every Access Right, even if a type is misconfigured."
    />

    <AppAlert v-if="error">
      Could not load Access Rights.
    </AppAlert>
    <AppAlert v-if="errorMessage">
      {{ errorMessage }}
    </AppAlert>
    <AppAlert
      v-if="notice"
      tone="success"
    >
      {{ notice }}
    </AppAlert>

    <AppPanel
      title="User Types"
      description="Assign seeded User Roles to a type. Staff start with no Marketing roles."
    >
      <div class="space-y-6">
        <div
          v-for="type in catalog?.userTypes ?? []"
          :key="type.id"
          class="border-b border-line pb-5 last:border-b-0 last:pb-0"
        >
          <p class="font-medium text-navy-900">
            {{ type.name }}
          </p>
          <p class="mt-1 text-sm text-muted">
            {{ type.description }} Application role: {{ type.coarseRole }}.
          </p>
          <div class="mt-3 grid gap-2 sm:grid-cols-2">
            <label
              v-for="role in catalog?.userRoles ?? []"
              :key="`${type.id}-${role.id}`"
              class="touch-row"
            >
              <input
                type="checkbox"
                class="mt-0.5"
                :checked="type.userRoleIds.includes(role.id)"
                :disabled="pendingTypeId === type.id"
                @change="toggleTypeRole(type, role.id)"
              >
              <span>
                {{ role.name }}
                <span class="block text-xs text-muted">{{ role.description }}</span>
              </span>
            </label>
          </div>
        </div>
      </div>
    </AppPanel>

    <AppPanel
      title="User Roles"
      description="Access Rights are defined in code. You can assign them to roles, but you cannot create new right names."
    >
      <div class="space-y-6">
        <div
          v-for="role in catalog?.userRoles ?? []"
          :key="role.id"
          class="border-b border-line pb-5 last:border-b-0 last:pb-0"
        >
          <p class="font-medium text-navy-900">
            {{ role.name }}
          </p>
          <p class="mt-1 text-sm text-muted">
            {{ role.description }}
          </p>
          <div class="mt-3 grid gap-2 sm:grid-cols-2">
            <label
              v-for="right in catalog?.accessRights ?? []"
              :key="`${role.id}-${right}`"
              class="touch-row"
            >
              <input
                type="checkbox"
                class="mt-0.5"
                :checked="role.accessRights.includes(right)"
                :disabled="pendingRoleId === role.id"
                @change="toggleRoleRight(role, right)"
              >
              <span>
                {{ ACCESS_RIGHT_LABELS[right] }}
                <span class="block text-xs text-muted">{{ ACCESS_RIGHT_DESCRIPTIONS[right] }}</span>
              </span>
            </label>
          </div>
        </div>
      </div>
    </AppPanel>
  </section>
</template>
