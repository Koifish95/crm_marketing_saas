import { useDb } from '../../../database'
import { observeRegisteredEnvironments } from '../../../services/observe'
import { HostnameError, assignPublicHostname } from '../../../services/public-hostname'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Environment id required.' })
  }
  const body = await readBody<{ hostname?: string, relaunch?: boolean }>(event)
  try {
    const hostname = await assignPublicHostname(useDb(), id, String(body?.hostname || ''), {
      relaunch: body?.relaunch,
    })
    return {
      hostname,
      checkedAt: new Date().toISOString(),
      environments: await observeRegisteredEnvironments(useDb()),
    }
  } catch (error) {
    if (error instanceof HostnameError) {
      throw createError({ statusCode: error.statusCode, statusMessage: error.message })
    }
    throw createError({
      statusCode: 500,
      statusMessage: error instanceof Error ? error.message : 'Hostname assignment failed.',
    })
  }
})
