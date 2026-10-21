<script setup lang="ts">
definePageMeta({
  layout: 'internal',
  middleware: ['auth', 'admin'],
})

useHead({
  title: 'Users',
})

type ManagedUser = {
  id: number
  displayName: string
  email: string
  username: string
  role: 'ADMIN' | 'STAFF' | 'VIEWER'
  active: boolean
  mustChangePassword: boolean
  lastLoginAt: string | null
}

const ROLES = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'STAFF', label: 'Staff' },
  { value: 'VIEWER', label: 'Viewer' },
] as const

const search = ref('')
const roleFilter = ref('')
const statusFilter = ref('')
const query = computed(() => ({
  search: search.value.trim() || undefined,
  role: roleFilter.value || undefined,
  active: statusFilter.value || undefined,
}))

const { data: users, error, pending, refresh } = await useFetch<ManagedUser[]>('/api/admin/users', { query })
const { data: me } = await useFetch<{ user?: { id: number } }>('/api/auth/me')

const createOpen = ref(false)
const personOpen = ref(false)
const createDialog = ref<HTMLDialogElement | null>(null)
const personDialog = ref<HTMLDialogElement | null>(null)
const selected = ref<ManagedUser | null>(null)
const draftRole = ref<ManagedUser['role']>('STAFF')
const displayName = ref('')
const email = ref('')
const role = ref<ManagedUser['role']>('STAFF')
const newPassword = ref('')
const resetPassword = ref('')
const errorMessage = ref('')
const notice = ref('')
const saving = ref(false)

const actorId = computed(() => me.value?.user?.id ?? null)
const people = computed(() => users.value ?? [])
const countLabel = computed(() => {
  const count = people.value.length
  return count === 1 ? '1 person' : `${count} people`
})
const managingSelf = computed(() => selected.value != null && selected.value.id === actorId.value)

function roleLabel(value: string) {
  return ROLES.find(item => item.value === value)?.label ?? value
}

function lastLoginLabel(value: string | null) {
  if (!value) {
    return 'Never'
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return 'Never'
  }
  return date.toLocaleString()
}

function messageOf(caught: unknown, fallback: string) {
  const err = caught as { data?: { message?: string }, statusMessage?: string }
  return err.data?.message || err.statusMessage || fallback
}

watch(createOpen, (open) => {
  const el = createDialog.value
  if (!el) {
    return
  }
  if (open && !el.open) {
    el.showModal()
  } else if (!open && el.open) {
    el.close()
  }
})

watch(personOpen, (open) => {
  const el = personDialog.value
  if (!el) {
    return
  }
  if (open && !el.open) {
    el.showModal()
  } else if (!open && el.open) {
    el.close()
  }
})

function closeCreate() {
  createOpen.value = false
  displayName.value = ''
  email.value = ''
  role.value = 'STAFF'
  newPassword.value = ''
  errorMessage.value = ''
}

function openPerson(person: ManagedUser) {
  selected.value = person
  draftRole.value = person.role
  resetPassword.value = ''
  notice.value = ''
  errorMessage.value = ''
  personOpen.value = true
}

function closePerson() {
  personOpen.value = false
  selected.value = null
  resetPassword.value = ''
  notice.value = ''
  errorMessage.value = ''
}

function remember(updated: ManagedUser) {
  if (selected.value?.id === updated.id) {
    selected.value = updated
    draftRole.value = updated.role
  }
}

async function createUser() {
  errorMessage.value = ''
  saving.value = true
  try {
    await $fetch('/api/admin/users', {
      method: 'POST',
      body: {
        displayName: displayName.value,
        email: email.value,
        role: role.value,
        ...(newPassword.value ? { password: newPassword.value } : {}),
      },
    })
    newPassword.value = ''
    closeCreate()
    await refresh()
  } catch (caught: unknown) {
    errorMessage.value = messageOf(caught, 'Could not create that user.')
  } finally {
    saving.value = false
  }
}

async function saveRole() {
  if (!selected.value) {
    return
  }
  errorMessage.value = ''
  notice.value = ''
  saving.value = true
  try {
    const updated = await $fetch<ManagedUser>(`/api/admin/users/${selected.value.id}/role`, {
      method: 'POST',
      body: { role: draftRole.value },
    })
    remember(updated)
    notice.value = 'Role saved.'
    await refresh()
  } catch (caught: unknown) {
    errorMessage.value = messageOf(caught, 'Could not change that role.')
  } finally {
    saving.value = false
  }
}

async function setActive(active: boolean) {
  if (!selected.value) {
    return
  }
  errorMessage.value = ''
  notice.value = ''
  saving.value = true
  try {
    const action = active ? 'activate' : 'deactivate'
    const updated = await $fetch<ManagedUser>(`/api/admin/users/${selected.value.id}/${action}`, { method: 'POST' })
    remember(updated)
    notice.value = active ? 'Account unlocked.' : 'Account locked.'
    await refresh()
  } catch (caught: unknown) {
    errorMessage.value = messageOf(caught, 'Could not change that account.')
  } finally {
    saving.value = false
  }
}

async function savePassword() {
  if (!selected.value) {
    return
  }
  errorMessage.value = ''
  notice.value = ''
  saving.value = true
  try {
    const updated = await $fetch<ManagedUser>(`/api/admin/users/${selected.value.id}/password-reset`, {
      method: 'POST',
      body: { password: resetPassword.value },
    })
    resetPassword.value = ''
    remember(updated)
    notice.value = 'Password saved.'
    await refresh()
  } catch (caught: unknown) {
    errorMessage.value = messageOf(caught, 'Could not save that password.')
  } finally {
    saving.value = false
  }
}

async function requireChange() {
  if (!selected.value) {
    return
  }
  errorMessage.value = ''
  notice.value = ''
  saving.value = true
  try {
    const updated = await $fetch<ManagedUser>(`/api/admin/users/${selected.value.id}/require-password-change`, { method: 'POST' })
    remember(updated)
    notice.value = 'They must change their password before the next login.'
    await refresh()
  } catch (caught: unknown) {
    errorMessage.value = messageOf(caught, 'Could not require a password change.')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <section class="directory">
    <header class="directory-mast">
      <div>
        <h1 class="directory-title">
          Users
        </h1>
        <p class="directory-count">
          {{ pending && !users ? 'Loading…' : countLabel }}
        </p>
      </div>
      <AppButton
        type="button"
        @click="createOpen = true"
      >
        Create user
      </AppButton>
    </header>

    <AppAlert v-if="error">
      Could not load users.
    </AppAlert>

    <div class="directory-toolbar">
      <input
        v-model="search"
        class="control directory-search"
        type="search"
        placeholder="Search name or email"
        aria-label="Search name or email"
      >
      <select
        v-model="roleFilter"
        class="control directory-filter"
        aria-label="Role"
      >
        <option value="">
          All roles
        </option>
        <option
          v-for="item in ROLES"
          :key="item.value"
          :value="item.value"
        >
          {{ item.label }}
        </option>
      </select>
      <select
        v-model="statusFilter"
        class="control directory-filter"
        aria-label="Status"
      >
        <option value="">
          All statuses
        </option>
        <option value="true">
          Active
        </option>
        <option value="false">
          Locked
        </option>
      </select>
    </div>

    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="pending && !users">
            <td colspan="4">
              Loading…
            </td>
          </tr>
          <tr v-else-if="people.length === 0">
            <td
              colspan="4"
              class="directory-empty"
            >
              No people match.
            </td>
          </tr>
          <tr
            v-for="person in people"
            :key="person.id"
            class="directory-row"
            tabindex="0"
            @click="openPerson(person)"
            @keydown.enter="openPerson(person)"
          >
            <td>{{ person.displayName }}</td>
            <td>{{ person.email }}</td>
            <td>{{ roleLabel(person.role) }}</td>
            <td>{{ person.active ? 'Active' : 'Locked' }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <dialog
      ref="createDialog"
      class="directory-dialog"
      aria-labelledby="create-user-title"
      @click.self="closeCreate"
      @close="createOpen = false"
    >
      <form
        class="directory-dialog-body"
        @submit.prevent="createUser"
      >
        <div class="directory-dialog-head">
          <h2 id="create-user-title">
            Create user
          </h2>
          <button
            type="button"
            class="btn btn-ghost"
            @click="closeCreate"
          >
            Close
          </button>
        </div>
        <AppAlert v-if="errorMessage">
          {{ errorMessage }}
        </AppAlert>
        <AppField
          label="Name"
          required
        >
          <input
            v-model="displayName"
            class="control"
            required
          >
        </AppField>
        <AppField
          label="Email"
          required
        >
          <input
            v-model="email"
            class="control"
            type="email"
            required
          >
        </AppField>
        <AppField label="Role">
          <select
            v-model="role"
            class="control"
          >
            <option
              v-for="item in ROLES"
              :key="item.value"
              :value="item.value"
            >
              {{ item.label }}
            </option>
          </select>
        </AppField>
        <AppField label="Password">
          <input
            v-model="newPassword"
            class="control"
            type="password"
            autocomplete="new-password"
          >
        </AppField>
        <p class="directory-note">
          Leave the password blank to issue a temporary one. They must change it before login. It is not shown again.
        </p>
        <div class="directory-actions">
          <AppButton
            type="submit"
            :loading="saving"
          >
            Create user
          </AppButton>
          <AppButton
            type="button"
            variant="secondary"
            @click="closeCreate"
          >
            Cancel
          </AppButton>
        </div>
      </form>
    </dialog>

    <dialog
      ref="personDialog"
      class="directory-drawer"
      aria-labelledby="person-title"
      @click.self="closePerson"
      @close="personOpen = false"
    >
      <div
        v-if="selected"
        class="directory-dialog-body"
      >
        <div class="directory-dialog-head">
          <div>
            <h2 id="person-title">
              {{ selected.displayName }}
            </h2>
            <p class="directory-note">
              {{ selected.email }}
            </p>
          </div>
          <button
            type="button"
            class="btn btn-ghost"
            @click="closePerson"
          >
            Close
          </button>
        </div>
        <dl class="directory-facts">
          <div>
            <dt>Role</dt>
            <dd>{{ roleLabel(selected.role) }}</dd>
          </div>
          <div>
            <dt>Last login</dt>
            <dd>{{ lastLoginLabel(selected.lastLoginAt) }}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{{ selected.active ? 'Active' : 'Locked' }}</dd>
          </div>
          <div>
            <dt>Password</dt>
            <dd>{{ selected.mustChangePassword ? 'Change required before login' : 'Current' }}</dd>
          </div>
        </dl>
        <AppAlert v-if="errorMessage">
          {{ errorMessage }}
        </AppAlert>
        <p
          v-else-if="notice"
          class="directory-note"
        >
          {{ notice }}
        </p>
        <p
          v-if="managingSelf"
          class="directory-note"
        >
          This is your account. You cannot lock it or change its password from here.
        </p>
        <AppField label="Role">
          <select
            v-model="draftRole"
            class="control"
            :disabled="managingSelf"
          >
            <option
              v-for="item in ROLES"
              :key="item.value"
              :value="item.value"
            >
              {{ item.label }}
            </option>
          </select>
        </AppField>
        <div class="directory-actions">
          <AppButton
            type="button"
            variant="secondary"
            :disabled="managingSelf"
            :loading="saving"
            @click="saveRole"
          >
            Save role
          </AppButton>
          <AppButton
            v-if="selected.active"
            type="button"
            variant="secondary"
            :disabled="managingSelf"
            :loading="saving"
            @click="setActive(false)"
          >
            Lock
          </AppButton>
          <AppButton
            v-else
            type="button"
            variant="secondary"
            :loading="saving"
            @click="setActive(true)"
          >
            Unlock
          </AppButton>
        </div>
        <AppField label="New password">
          <input
            v-model="resetPassword"
            class="control"
            type="password"
            autocomplete="new-password"
            :disabled="managingSelf"
          >
        </AppField>
        <p class="directory-note">
          Saving a password does not require them to change it. The password is not shown again.
        </p>
        <div class="directory-actions">
          <AppButton
            type="button"
            variant="secondary"
            :disabled="managingSelf || resetPassword.length === 0"
            :loading="saving"
            @click="savePassword"
          >
            Save password
          </AppButton>
          <AppButton
            type="button"
            variant="secondary"
            :disabled="managingSelf"
            :loading="saving"
            @click="requireChange"
          >
            Require password change
          </AppButton>
        </div>
      </div>
    </dialog>
  </section>
</template>
