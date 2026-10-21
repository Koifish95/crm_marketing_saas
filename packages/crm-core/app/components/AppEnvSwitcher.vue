<script setup lang="ts">
import {
  APP_ENV_LABELS,
  switcherEntries,
  type AppEnv,
} from '@crm/core/shared/utils/app-env'

withDefaults(defineProps<{
  inverted?: boolean
}>(), {
  inverted: false,
})

const url = useRequestURL()
const config = useRuntimeConfig()
const publicConfig = computed(() => config.public as {
  appEnv?: string
  envSwitcherMode?: string
  productionOrigin?: string
  devOrigin?: string
  stageOrigin?: string
})

const entries = computed(() => switcherEntries({
  mode: publicConfig.value.envSwitcherMode,
  appEnv: publicConfig.value.appEnv,
  origins: {
    production: publicConfig.value.productionOrigin,
    dev: publicConfig.value.devOrigin,
    stage: publicConfig.value.stageOrigin,
  },
  location: {
    protocol: url.protocol,
    hostname: url.hostname,
    port: url.port,
    pathname: url.pathname,
    search: url.search,
    hash: url.hash,
  },
}))

function itemClass(env: AppEnv, current: boolean, inverted: boolean) {
  if (inverted) {
    if (env === 'dev') {
      return current
        ? 'bg-danger-50 text-danger-700'
        : 'text-white/70 hover:bg-white/10 hover:text-white'
    }
    if (env === 'stage') {
      return current
        ? 'bg-success-50 text-success-700'
        : 'text-white/70 hover:bg-white/10 hover:text-white'
    }
    return current
      ? 'bg-white text-navy-900'
      : 'text-white/70 hover:bg-white/10 hover:text-white'
  }
  if (env === 'dev') {
    return current
      ? 'bg-danger-50 text-danger-700'
      : 'text-muted hover:bg-danger-50 hover:text-danger-700'
  }
  if (env === 'stage') {
    return current
      ? 'bg-success-50 text-success-700'
      : 'text-muted hover:bg-success-50 hover:text-success-700'
  }
  return current
    ? 'bg-navy-900 text-white'
    : 'text-muted hover:bg-navy-900 hover:text-white'
}
</script>

<template>
  <nav
    class="flex flex-wrap items-center gap-1"
    aria-label="Environments"
  >
    <template
      v-for="entry in entries"
      :key="entry.env"
    >
      <span
        v-if="entry.current || !entry.href"
        class="rounded-md px-2 py-1 text-[11px] font-semibold uppercase tracking-wide"
        :class="itemClass(entry.env, entry.current, inverted)"
        :aria-current="entry.current ? 'true' : undefined"
      >
        {{ APP_ENV_LABELS[entry.env] }}
      </span>
      <a
        v-else
        :href="entry.href"
        class="rounded-md px-2 py-1 text-[11px] font-semibold uppercase tracking-wide"
        :class="itemClass(entry.env, false, inverted)"
      >
        {{ APP_ENV_LABELS[entry.env] }}
      </a>
    </template>
  </nav>
</template>
