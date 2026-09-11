import {
  FLEET_STATUS_KEY,
  fleetStatusCachedData,
  shouldReuseFleetStatusCache,
  summarizeFleet,
  type FleetStatusResponse,
} from '~~/shared/utils/fleet'

export async function useFleetStatus() {
  const { data, error, pending, refresh } = await useFetch<FleetStatusResponse>('/api/status', {
    key: FLEET_STATUS_KEY,
    getCachedData: (key, nuxtApp, ctx) => {
      if (!shouldReuseFleetStatusCache(ctx.cause)) {
        return
      }
      return fleetStatusCachedData(
        key,
        nuxtApp.payload.data as Record<string, unknown> | undefined,
        nuxtApp.static.data as Record<string, unknown> | undefined,
      ) as FleetStatusResponse | undefined
    },
  })
  const refreshing = ref(false)

  const environments = computed(() => data.value?.environments || [])
  const summary = computed(() => summarizeFleet(environments.value))

  async function refreshStatus() {
    refreshing.value = true
    try {
      await refresh()
    } finally {
      refreshing.value = false
    }
  }

  function applyStatus(payload: FleetStatusResponse) {
    data.value = payload
  }

  return {
    data,
    error,
    pending,
    refreshing,
    environments,
    summary,
    checkedAt: computed(() => data.value?.checkedAt || ''),
    refreshStatus,
    applyStatus,
  }
}

export function fetchMessage(error: unknown, fallback: string) {
  if (error && typeof error === 'object' && 'data' in error) {
    const payload = (error as { data?: { statusMessage?: string } }).data
    if (payload?.statusMessage) {
      return payload.statusMessage
    }
  }
  return error instanceof Error ? error.message : fallback
}
