<script setup lang="ts">
defineProps<{
  label: string
  columns: string[]
}>()
</script>

<template>
  <div class="table-wrap">
    <table
      class="data-table"
      :aria-label="label"
    >
      <thead>
        <tr>
          <th
            v-for="column in columns"
            :key="column"
          >
            {{ column }}
          </th>
        </tr>
      </thead>
      <tbody>
        <slot />
      </tbody>
    </table>
  </div>
</template>
