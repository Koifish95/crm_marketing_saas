import { useDb } from '../database'
import { runProspectTick } from '../services/prospect-outreach'

export default defineNitroPlugin(() => {
  if (process.env.VITEST) {
    return
  }
  const run = () => {
    void runProspectTick(useDb()).catch((error: unknown) => {
      console.error('[prospect-desk]', error instanceof Error ? error.message : error)
    })
  }
  const start = setTimeout(run, 15_000)
  const timer = setInterval(run, 60_000)
  start.unref()
  timer.unref()
})
