import { FLEET_STATUS_KEY, fleetStatusCachedData, summarizeFleet, type FleetStatusResponse } from '~~/shared/utils/fleet'

export async function useFleetStatus() {
  const { data, error, pending, refresh } = await useFetch<FleetStatusResponse>('/api/status', {
    key: FLEET_STATUS_KEY,
    getCachedData: (key, nuxtApp) => fleetStatusCachedData(
      key,
      nuxtApp.payload.data as Record<string, unknown> | undefined,
      nuxtApp.static.data as Record<string, unknown> | undefined,
    ) as FleetStatusResponse | undefined,
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

  return {
    data,
    error,
    pending,
    refreshing,
    environments,
    summary,
    checkedAt: computed(() => data.value?.checkedAt || ''),
    refreshStatus,
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
