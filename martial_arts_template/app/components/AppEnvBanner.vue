<script setup lang="ts">
import { APP_ENV_LABELS, isNonProductionAppEnv, type AppEnv } from '#shared/utils/app-env'

const config = useRuntimeConfig()
const appEnv = computed(() => config.public.appEnv as AppEnv)
const visible = computed(() => isNonProductionAppEnv(appEnv.value))
const label = computed(() => APP_ENV_LABELS[appEnv.value] ?? String(appEnv.value))
</script>

<template>
  <div
    v-if="visible"
    role="status"
    class="sticky top-0 z-[60] px-3 py-1.5 text-center text-xs font-semibold uppercase tracking-wide"
    :class="appEnv === 'dev'
      ? 'bg-danger-50 text-danger-700'
      : 'bg-success-50 text-success-700'"
  >
    {{ label }} environment — not production
  </div>
</template>
