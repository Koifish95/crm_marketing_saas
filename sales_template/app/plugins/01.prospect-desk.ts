import { prospectDeskNavEnabled } from '../../lib/prospect-desk-nav'

export default defineNuxtPlugin(async () => {
  try {
    const status = await $fetch<{ enabled: boolean }>('/api/prospects/availability')
    prospectDeskNavEnabled.value = status.enabled
  } catch {
    prospectDeskNavEnabled.value = false
  }
})
