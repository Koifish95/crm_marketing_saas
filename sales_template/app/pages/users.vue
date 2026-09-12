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
  role: string
  active: boolean
}

const { data: users, error, pending, refresh } = await useFetch<ManagedUser[]>('/api/admin/users')
const displayName = ref('')
const email = ref('')
const role = ref('STAFF')
const errorMessage = ref('')
const saving = ref(false)

async function create() {
  errorMessage.value = ''
  saving.value = true
  try {
    await $fetch('/api/admin/users', {
      method: 'POST',
      body: {
        displayName: displayName.value,
        email: email.value,
        role: role.value,
      },
    })
    displayName.value = ''
    email.value = ''
    await refresh()
  } catch (caught: unknown) {
    const err = caught as { data?: { message?: string } }
    errorMessage.value = err.data?.message || 'Could not create that user.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <section class="space-y-6">
    <AppPageHeader
      title="Users"
      description="Thin Core user administration. Full Access Rights matrix remains a future Core-promotion candidate."
    />
    <AppAlert v-if="error || errorMessage">
      {{ errorMessage || 'Could not load users.' }}
    </AppAlert>
    <AppPanel title="Create user">
      <form
        class="grid gap-3 sm:grid-cols-3"
        @submit.prevent="create"
      >
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
            type="email"
            class="control"
            required
          >
        </AppField>
        <AppField label="Role">
          <select
            v-model="role"
            class="control"
          >
            <option value="ADMIN">
              ADMIN
            </option>
            <option value="STAFF">
              STAFF
            </option>
            <option value="VIEWER">
              VIEWER
            </option>
          </select>
        </AppField>
        <div class="sm:col-span-3">
          <AppButton
            type="submit"
            :loading="saving"
          >
            Create user
          </AppButton>
        </div>
      </form>
    </AppPanel>
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
        <tr
          v-for="user in users"
          :key="user.id"
        >
          <td>{{ user.displayName }}</td>
          <td>{{ user.email }}</td>
          <td>{{ user.role }}</td>
          <td>{{ user.active ? 'Active' : 'Inactive' }}</td>
        </tr>
      </tbody>
    </table>
  </section>
</template>
