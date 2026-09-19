import { createClient } from '@libsql/client'
import { getDatabaseUrl } from '../../database'
import { snapshotControlPlaneRegistry } from '../../services/control-plane-backup'

export default defineEventHandler(async () => {
  const databaseUrl = getDatabaseUrl()
  const client = createClient({ url: databaseUrl })
  try {
    const backup = await snapshotControlPlaneRegistry(client, { databaseUrl })
    return {
      backup,
      checkedAt: new Date().toISOString(),
    }
  } finally {
    client.close()
  }
})
