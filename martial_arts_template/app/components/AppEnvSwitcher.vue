<script setup lang="ts">
import {
  APP_ENV_LABELS,
  APP_ENV_SWITCHER_ORDER,
  currentAppEnvFromLocation,
  environmentSwitcherHref,
  type AppEnv,
} from '#shared/utils/app-env'

withDefaults(defineProps<{
  inverted?: boolean
}>(), {
  inverted: false,
})

const url = useRequestURL()
const currentEnv = computed(() => currentAppEnvFromLocation({
  protocol: url.protocol,
  hostname: url.hostname,
  port: url.port,
}))

function hrefFor(env: AppEnv) {
  return environmentSwitcherHref({
    protocol: url.protocol,
    hostname: url.hostname,
    port: url.port,
    pathname: url.pathname,
    search: url.search,
    hash: url.hash,
    targetEnv: env,
  })
}

function isCurrent(env: AppEnv) {
  return currentEnv.value === env
}

function itemClass(env: AppEnv, inverted: boolean) {
  const current = isCurrent(env)
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
      v-for="env in APP_ENV_SWITCHER_ORDER"
      :key="env"
    >
      <span
        v-if="isCurrent(env)"
        class="rounded-md px-2 py-1 text-[11px] font-semibold uppercase tracking-wide"
        :class="itemClass(env, inverted)"
        aria-current="true"
      >
        {{ APP_ENV_LABELS[env] }}
      </span>
      <a
        v-else
        :href="hrefFor(env)"
        class="rounded-md px-2 py-1 text-[11px] font-semibold uppercase tracking-wide"
        :class="itemClass(env, inverted)"
      >
        {{ APP_ENV_LABELS[env] }}
      </a>
    </template>
  </nav>
</template>
