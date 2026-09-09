<script setup lang="ts">
import { roleLabel, USER_ROLES } from '#shared/utils/labels'
import { PASSWORD_POLICY_COPY, TEMPORARY_PASSWORD_DEFAULT } from '#shared/utils/password-policy'
import { toBusinessDateTime } from '#shared/utils/time'
import type { UserRole } from '#shared/schemas/enums'

definePageMeta({
  layout: 'internal',
  middleware: ['auth', 'admin'],
})

useHead({
  title: 'Users',
})

interface ManagedUser {
  id: number
  email: string
  username: string
  displayName: string
  role: UserRole
  userTypeId: number | null
  extraRoleIds: number[]
  active: boolean
  mustChangePassword: boolean
  lastLoginAt: string | Date | null
}

interface CatalogRole {
  id: number
  name: string
  description: string | null
}

interface CatalogType {
  id: number
  name: string
  coarseRole: string
}

const { data: catalog } = await useFetch<{
  userTypes: CatalogType[]
  userRoles: CatalogRole[]
}>('/api/admin/access')

const { user: sessionUser } = useUserSession()
const search = ref('')
const role = ref('')
const active = ref('')
const errorMessage = ref('')
const creating = ref(false)
const createPending = ref(false)
const createForm = reactive({
  displayName: '',
  email: '',
  username: '',
  role: 'STAFF' as UserRole,
  password: '',
})
const editing = ref<ManagedUser | null>(null)
const editForm = reactive({
  displayName: '',
  email: '',
  username: '',
})
const editPending = ref(false)
const roleTarget = ref<ManagedUser | null>(null)
const nextRole = ref<UserRole>('STAFF')
const rolePending = ref(false)
const accessTarget = ref<ManagedUser | null>(null)
const nextTypeId = ref<number | null>(null)
const nextExtraRoleIds = ref<number[]>([])
const accessPending = ref(false)
const passwordTarget = ref<ManagedUser | null>(null)
const passwordForm = reactive({
  password: '',
  confirm: '',
})
const passwordPending = ref(false)
const confirmKind = ref<'requirePasswordChange' | 'revoke' | 'deactivate' | 'activate' | null>(null)
const confirmUser = ref<ManagedUser | null>(null)
const moreUser = ref<ManagedUser | null>(null)

function closeMore() {
  moreUser.value = null
}

function toggleMore(person: ManagedUser) {
  moreUser.value = moreUser.value?.id === person.id ? null : person
}

function startRole(person: ManagedUser) {
  closeMore()
  passwordTarget.value = null
  roleTarget.value = person
  nextRole.value = person.role
}

function startAccess(person: ManagedUser) {
  closeMore()
  passwordTarget.value = null
  accessTarget.value = person
  nextTypeId.value = person.userTypeId
  nextExtraRoleIds.value = [...(person.extraRoleIds ?? [])]
}

function typeName(userTypeId: number | null | undefined) {
  if (userTypeId == null) {
    return 'Not assigned'
  }
  return catalog.value?.userTypes.find(type => type.id === userTypeId)?.name ?? 'Assigned'
}

function toggleExtraRole(roleId: number) {
  if (nextExtraRoleIds.value.includes(roleId)) {
    nextExtraRoleIds.value = nextExtraRoleIds.value.filter(id => id !== roleId)
    return
  }
  nextExtraRoleIds.value = [...nextExtraRoleIds.value, roleId]
}

const query = computed(() => ({
  search: search.value || undefined,
  role: role.value || undefined,
  active: active.value || undefined,
}))

const { data: people, pending, error, refresh } = await useFetch<ManagedUser[]>('/api/admin/users', { query })

function when(value: string | Date | null | undefined) {
  if (!value) {
    return 'Never'
  }
  return toBusinessDateTime(new Date(value).getTime())
}

function apiError(caught: unknown, fallback: string) {
  const err = caught as { data?: { message?: string }, message?: string }
  return err.data?.message || err.message || fallback
}

function resetCreate() {
  createForm.displayName = ''
  createForm.email = ''
  createForm.username = ''
  createForm.role = 'STAFF'
  createForm.password = ''
  creating.value = false
}

function startEdit(person: ManagedUser) {
  closeMore()
  passwordTarget.value = null
  editing.value = person
  editForm.displayName = person.displayName
  editForm.email = person.email
  editForm.username = person.username
}

function startResetPassword(person: ManagedUser) {
  closeMore()
  creating.value = false
  editing.value = null
  roleTarget.value = null
  accessTarget.value = null
  passwordTarget.value = person
  passwordForm.password = ''
  passwordForm.confirm = ''
}

function closeResetPassword() {
  passwordTarget.value = null
  passwordForm.password = ''
  passwordForm.confirm = ''
}

async function saveResetPassword() {
  if (!passwordTarget.value) {
    return
  }
  errorMessage.value = ''
  if (passwordForm.password !== passwordForm.confirm) {
    errorMessage.value = 'New password and confirmation do not match.'
    return
  }
  passwordPending.value = true
  try {
    await $fetch(`/api/admin/users/${passwordTarget.value.id}/password-reset`, {
      method: 'POST',
      body: { password: passwordForm.password },
    })
    closeResetPassword()
    await refresh()
  } catch (caught: unknown) {
    errorMessage.value = apiError(caught, 'Could not reset that password.')
  } finally {
    passwordPending.value = false
  }
}

async function createUser() {
  errorMessage.value = ''
  createPending.value = true
  try {
    await $fetch('/api/admin/users', {
      method: 'POST',
      body: {
        displayName: createForm.displayName,
        email: createForm.email,
        username: createForm.username || undefined,
        role: createForm.role,
        password: createForm.password || undefined,
      },
    })
    resetCreate()
    await refresh()
  } catch (caught: unknown) {
    errorMessage.value = apiError(caught, 'Could not create that user.')
  } finally {
    createPending.value = false
  }
}

async function saveEdit() {
  if (!editing.value) {
    return
  }
  errorMessage.value = ''
  editPending.value = true
  try {
    await $fetch(`/api/admin/users/${editing.value.id}`, {
      method: 'PATCH',
      body: {
        displayName: editForm.displayName,
        email: editForm.email,
        username: editForm.username,
      },
    })
    editing.value = null
    await refresh()
  } catch (caught: unknown) {
    errorMessage.value = apiError(caught, 'Could not save that user.')
  } finally {
    editPending.value = false
  }
}

async function saveRole() {
  if (!roleTarget.value) {
    return
  }
  errorMessage.value = ''
  rolePending.value = true
  try {
    await $fetch(`/api/admin/users/${roleTarget.value.id}/role`, {
      method: 'POST',
      body: { role: nextRole.value },
    })
    roleTarget.value = null
    await refresh()
  } catch (caught: unknown) {
    errorMessage.value = apiError(caught, 'Could not change that role.')
  } finally {
    rolePending.value = false
  }
}

async function saveAccess() {
  if (!accessTarget.value || nextTypeId.value == null) {
    return
  }
  errorMessage.value = ''
  accessPending.value = true
  try {
    await $fetch(`/api/admin/users/${accessTarget.value.id}/type`, {
      method: 'POST',
      body: { userTypeId: nextTypeId.value },
    })
    await $fetch(`/api/admin/users/${accessTarget.value.id}/roles`, {
      method: 'PUT',
      body: { userRoleIds: nextExtraRoleIds.value },
    })
    accessTarget.value = null
    await refresh()
  } catch (caught: unknown) {
    errorMessage.value = apiError(caught, 'Could not save access.')
  } finally {
    accessPending.value = false
  }
}

function ask(kind: 'requirePasswordChange' | 'revoke' | 'deactivate' | 'activate', person: ManagedUser) {
  closeMore()
  confirmKind.value = kind
  confirmUser.value = person
}

const confirmOpen = computed({
  get: () => Boolean(confirmKind.value && confirmUser.value),
  set: (value: boolean) => {
    if (!value) {
      confirmKind.value = null
      confirmUser.value = null
    }
  },
})

const confirmCopy = computed(() => {
  const person = confirmUser.value
  const name = person?.displayName || 'this user'
  if (confirmKind.value === 'requirePasswordChange') {
    return {
      title: 'Require a new password?',
      description: `${name} can still sign in with their current password, then must set a new one. Existing sessions will be signed out.`,
      confirmLabel: 'Require password change',
      danger: false,
    }
  }
  if (confirmKind.value === 'revoke') {
    return {
      title: 'Revoke sessions?',
      description: `${name} will be signed out on every browser. Their password stays the same.`,
      confirmLabel: 'Revoke sessions',
      danger: false,
    }
  }
  if (confirmKind.value === 'activate') {
    return {
      title: 'Reactivate user?',
      description: `${name} will be able to sign in again.`,
      confirmLabel: 'Reactivate',
      danger: false,
    }
  }
  return {
    title: 'Deactivate user?',
    description: `${name} will not be able to sign in. History stays in the system.`,
    confirmLabel: 'Deactivate',
    danger: true,
  }
})

async function runConfirm() {
  const person = confirmUser.value
  const kind = confirmKind.value
  if (!person || !kind) {
    return
  }
  errorMessage.value = ''
  try {
    if (kind === 'requirePasswordChange') {
      await $fetch(`/api/admin/users/${person.id}/require-password-change`, { method: 'POST' })
    } else if (kind === 'revoke') {
      await $fetch(`/api/admin/users/${person.id}/revoke-sessions`, { method: 'POST' })
    } else if (kind === 'activate') {
      await $fetch(`/api/admin/users/${person.id}/activate`, { method: 'POST' })
    } else {
      await $fetch(`/api/admin/users/${person.id}/deactivate`, { method: 'POST' })
    }
    await refresh()
  } catch (caught: unknown) {
    errorMessage.value = apiError(caught, 'Could not update that user.')
  }
}
</script>

<template>
  <section class="space-y-6">
    <AppPageHeader
      title="Users"
      description="Create staff accounts, change roles, and reset access. People are never deleted."
    >
      <template #actions>
        <AppButton
          variant="primary"
          @click="creating = !creating"
        >
          {{ creating ? 'Cancel' : 'New user' }}
        </AppButton>
      </template>
    </AppPageHeader>

    <AppAlert v-if="errorMessage || error">
      {{ errorMessage || 'Could not load users.' }}
    </AppAlert>

    <AppPanel
      v-if="creating"
      title="New user"
      description="They can sign in with email or username and must set a permanent password on first login."
    >
      <form
        class="grid max-w-xl gap-4 sm:grid-cols-2"
        @submit.prevent="createUser"
      >
        <AppField
          label="Name"
          required
        >
          <input
            v-model="createForm.displayName"
            type="text"
            required
            maxlength="120"
            class="control"
          >
        </AppField>
        <AppField
          label="Email"
          required
        >
          <input
            v-model="createForm.email"
            type="email"
            required
            autocomplete="email"
            class="control"
          >
        </AppField>
        <AppField
          label="Username"
          hint="Optional. Leave blank to assign one from the email. They can sign in with email or username."
        >
          <input
            v-model="createForm.username"
            type="text"
            autocomplete="off"
            maxlength="80"
            class="control"
          >
        </AppField>
        <AppField
          label="Role"
          required
        >
          <select
            v-model="createForm.role"
            class="control"
          >
            <option
              v-for="item in USER_ROLES"
              :key="item"
              :value="item"
            >
              {{ roleLabel(item) }}
            </option>
          </select>
        </AppField>
        <AppField
          label="Temporary password"
          :hint="`Leave blank to use ${TEMPORARY_PASSWORD_DEFAULT}.`"
        >
          <input
            v-model="createForm.password"
            type="text"
            autocomplete="off"
            class="control"
          >
        </AppField>
        <div class="sm:col-span-2">
          <AppButton
            type="submit"
            :loading="createPending"
          >
            {{ createPending ? 'Creating…' : 'Create user' }}
          </AppButton>
        </div>
      </form>
    </AppPanel>

    <AppPanel
      v-if="editing"
      title="Edit user"
    >
      <form
        class="grid max-w-xl gap-4 sm:grid-cols-2"
        @submit.prevent="saveEdit"
      >
        <AppField
          label="Name"
          required
        >
          <input
            v-model="editForm.displayName"
            type="text"
            required
            maxlength="120"
            class="control"
          >
        </AppField>
        <AppField
          label="Email"
          required
        >
          <input
            v-model="editForm.email"
            type="email"
            required
            autocomplete="email"
            class="control"
          >
        </AppField>
        <AppField
          label="Username"
          required
          hint="They can sign in with this username or their email."
        >
          <input
            v-model="editForm.username"
            type="text"
            required
            maxlength="80"
            class="control"
          >
        </AppField>
        <div class="flex flex-wrap gap-2 sm:col-span-2">
          <AppButton
            type="submit"
            :loading="editPending"
          >
            {{ editPending ? 'Saving…' : 'Save' }}
          </AppButton>
          <AppButton
            variant="secondary"
            type="button"
            @click="editing = null"
          >
            Cancel
          </AppButton>
        </div>
      </form>
    </AppPanel>

    <AppPanel
      v-if="passwordTarget"
      title="Reset password"
      :description="`${passwordTarget.displayName} can sign in with this password immediately. Existing sessions will be signed out.`"
    >
      <form
        class="grid max-w-xl gap-4 sm:grid-cols-2"
        @submit.prevent="saveResetPassword"
      >
        <AppField
          label="New password"
          required
          :hint="PASSWORD_POLICY_COPY"
        >
          <input
            v-model="passwordForm.password"
            type="password"
            required
            autocomplete="new-password"
            class="control"
          >
        </AppField>
        <AppField
          label="Confirm password"
          required
        >
          <input
            v-model="passwordForm.confirm"
            type="password"
            required
            autocomplete="new-password"
            class="control"
          >
        </AppField>
        <div class="flex flex-wrap gap-2 sm:col-span-2">
          <AppButton
            type="submit"
            :loading="passwordPending"
          >
            {{ passwordPending ? 'Saving…' : 'Set password' }}
          </AppButton>
          <AppButton
            variant="secondary"
            type="button"
            @click="closeResetPassword"
          >
            Cancel
          </AppButton>
        </div>
      </form>
    </AppPanel>

    <AppPanel
      v-if="roleTarget"
      title="Change role"
      :description="roleTarget.displayName"
    >
      <form
        class="flex max-w-md flex-wrap items-end gap-3"
        @submit.prevent="saveRole"
      >
        <AppField
          class="min-w-40 flex-1"
          label="Role"
        >
          <select
            v-model="nextRole"
            class="control"
          >
            <option
              v-for="item in USER_ROLES"
              :key="item"
              :value="item"
            >
              {{ roleLabel(item) }}
            </option>
          </select>
        </AppField>
        <AppButton
          type="submit"
          :loading="rolePending"
        >
          Save role
        </AppButton>
        <AppButton
          variant="secondary"
          type="button"
          @click="roleTarget = null"
        >
          Cancel
        </AppButton>
      </form>
    </AppPanel>

    <AppPanel
      v-if="accessTarget"
      title="Access"
      :description="accessTarget.displayName"
    >
      <form
        class="grid max-w-2xl gap-4"
        @submit.prevent="saveAccess"
      >
        <AppField
          label="User Type"
          hint="Changing type also updates the application role. The last active admin cannot be demoted."
        >
          <select
            v-model.number="nextTypeId"
            class="control"
          >
            <option
              v-for="type in catalog?.userTypes ?? []"
              :key="type.id"
              :value="type.id"
            >
              {{ type.name }}
            </option>
          </select>
        </AppField>
        <fieldset>
          <legend class="mb-2 text-sm font-medium text-navy-900">
            Extra User Roles
          </legend>
          <p class="mb-3 text-sm text-muted">
            These add Access Rights on top of the User Type. Staff start with none.
          </p>
          <div class="grid gap-2 sm:grid-cols-2">
            <label
              v-for="item in catalog?.userRoles ?? []"
              :key="item.id"
              class="touch-row"
            >
              <input
                type="checkbox"
                class="mt-0.5"
                :checked="nextExtraRoleIds.includes(item.id)"
                @change="toggleExtraRole(item.id)"
              >
              <span>
                {{ item.name }}
                <span class="block text-xs text-muted">{{ item.description }}</span>
              </span>
            </label>
          </div>
        </fieldset>
        <div class="flex flex-wrap gap-2">
          <AppButton
            type="submit"
            :loading="accessPending"
          >
            Save access
          </AppButton>
          <AppButton
            variant="secondary"
            type="button"
            @click="accessTarget = null"
          >
            Cancel
          </AppButton>
        </div>
      </form>
    </AppPanel>

    <form
      class="panel grid gap-3 p-5 sm:grid-cols-3"
      @submit.prevent="refresh()"
    >
      <input
        v-model="search"
        placeholder="Search name, email, or username"
        class="control"
        aria-label="Search users"
      >
      <select
        v-model="role"
        class="control"
        aria-label="Role"
      >
        <option value="">
          All roles
        </option>
        <option
          v-for="item in USER_ROLES"
          :key="item"
          :value="item"
        >
          {{ roleLabel(item) }}
        </option>
      </select>
      <select
        v-model="active"
        class="control"
        aria-label="Status"
      >
        <option value="">
          Active and inactive
        </option>
        <option value="true">
          Active
        </option>
        <option value="false">
          Inactive
        </option>
      </select>
    </form>

    <p
      v-if="pending && !people"
      class="text-sm text-muted"
    >
      Loading users…
    </p>
    <AppEmpty
      v-else-if="!people?.length"
      title="No users match"
      description="Try a different search or create a user."
    />
    <div
      v-else
      class="space-y-3 md:hidden"
    >
      <div
        v-for="person in people"
        :key="person.id"
        class="panel p-4"
      >
        <div class="flex flex-wrap items-start gap-2">
          <p class="min-w-0 font-medium text-navy-900">
            {{ person.displayName }}
          </p>
          <AppBadge
            class="ml-auto shrink-0"
            :tone="person.active ? 'success' : 'muted'"
          >
            {{ person.active ? 'Active' : 'Inactive' }}
          </AppBadge>
        </div>
        <p class="mt-1 text-sm text-muted">
          {{ roleLabel(person.role) }} · {{ person.username }}
        </p>
        <p
          v-if="person.mustChangePassword"
          class="mt-1 text-xs text-muted"
        >
          Must change password
        </p>
        <div class="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            class="btn btn-subtle text-sm"
            @click="startEdit(person)"
          >
            Edit
          </button>
          <button
            type="button"
            class="btn btn-subtle text-sm"
            @click="startAccess(person)"
          >
            Access
          </button>
          <button
            type="button"
            class="btn btn-subtle text-sm"
            :aria-expanded="moreUser?.id === person.id"
            aria-haspopup="menu"
            @click="toggleMore(person)"
          >
            More
          </button>
        </div>
      </div>
    </div>
    <div
      v-if="people?.length"
      class="panel hidden overflow-x-auto md:block"
    >
      <table class="data-table">
        <thead class="border-b border-line bg-canvas text-muted">
          <tr>
            <th class="px-4 py-3 font-medium">
              Name
            </th>
            <th class="px-4 py-3 font-medium">
              Username
            </th>
            <th class="px-4 py-3 font-medium">
              Role
            </th>
            <th class="px-4 py-3 font-medium">
              User Type
            </th>
            <th class="px-4 py-3 font-medium">
              Status
            </th>
            <th class="px-4 py-3 font-medium">
              Last sign-in
            </th>
            <th class="px-4 py-3 font-medium">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="person in people"
            :key="person.id"
            class="border-t border-line"
          >
            <td class="px-4 py-3">
              <p class="font-medium text-navy-900">
                {{ person.displayName }}
              </p>
              <p class="text-xs text-muted">
                {{ person.email }}
              </p>
            </td>
            <td class="px-4 py-3 text-navy-900">
              {{ person.username }}
            </td>
            <td class="px-4 py-3">
              {{ roleLabel(person.role) }}
            </td>
            <td class="px-4 py-3">
              {{ typeName(person.userTypeId) }}
            </td>
            <td class="px-4 py-3">
              <AppBadge :tone="person.active ? 'success' : 'muted'">
                {{ person.active ? 'Active' : 'Inactive' }}
              </AppBadge>
              <p
                v-if="person.mustChangePassword"
                class="mt-1 text-xs text-muted"
              >
                Must change password
              </p>
            </td>
            <td class="px-4 py-3 text-muted">
              {{ when(person.lastLoginAt) }}
            </td>
            <td class="px-4 py-3">
              <div class="flex items-center gap-2 whitespace-nowrap">
                <button
                  type="button"
                  class="btn btn-subtle text-sm"
                  @click="startEdit(person)"
                >
                  Edit
                </button>
                <button
                  type="button"
                  class="btn btn-subtle text-sm"
                  @click="startAccess(person)"
                >
                  Access
                </button>
                <button
                  type="button"
                  class="btn btn-subtle text-sm"
                  :aria-expanded="moreUser?.id === person.id"
                  aria-haspopup="menu"
                  @click="toggleMore(person)"
                >
                  More
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <AppOverflowMenu
      :open="Boolean(moreUser)"
      :title="moreUser ? moreUser.displayName : 'More'"
      @update:open="moreUser = $event ? moreUser : null"
    >
      <button
        v-if="moreUser && moreUser.id !== sessionUser?.id"
        type="button"
        class="btn btn-subtle min-h-11 w-full justify-start"
        role="menuitem"
        @click="startRole(moreUser)"
      >
        Role
      </button>
      <button
        v-if="moreUser && moreUser.id !== sessionUser?.id"
        type="button"
        class="btn btn-subtle min-h-11 w-full justify-start"
        role="menuitem"
        @click="startResetPassword(moreUser)"
      >
        Reset password
      </button>
      <button
        v-if="moreUser && moreUser.id !== sessionUser?.id"
        type="button"
        class="btn btn-subtle min-h-11 w-full justify-start"
        role="menuitem"
        @click="ask('requirePasswordChange', moreUser)"
      >
        Require password change
      </button>
      <button
        v-if="moreUser"
        type="button"
        class="btn btn-subtle min-h-11 w-full justify-start"
        role="menuitem"
        @click="ask('revoke', moreUser)"
      >
        Revoke sessions
      </button>
      <button
        v-if="moreUser?.active && moreUser.id !== sessionUser?.id"
        type="button"
        class="btn btn-subtle min-h-11 w-full justify-start"
        role="menuitem"
        @click="ask('deactivate', moreUser)"
      >
        Deactivate
      </button>
      <button
        v-if="moreUser && !moreUser.active"
        type="button"
        class="btn btn-subtle min-h-11 w-full justify-start"
        role="menuitem"
        @click="ask('activate', moreUser)"
      >
        Reactivate
      </button>
    </AppOverflowMenu>

    <AppConfirm
      v-model:open="confirmOpen"
      :title="confirmCopy.title"
      :description="confirmCopy.description"
      :confirm-label="confirmCopy.confirmLabel"
      :danger="confirmCopy.danger"
      @confirm="runConfirm"
    />
  </section>
</template>
