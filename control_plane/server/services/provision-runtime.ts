import { spawnSync } from 'node:child_process'
import { eq } from 'drizzle-orm'
import type { Database } from '../database'
import { environments } from '../database/schema'
import { MARTIAL_ARTS_PRODUCT, requireProduct } from '../products/catalog'
import { composeArgs, composeRootForEnvironment, repoRoot, resolveComposeEnvFile } from './docker-relaunch'
import { probeRegisteredHealth } from './health'
import { listRegisteredEnvironments } from './registry'

export function imageInspectArgs(image = MARTIAL_ARTS_PRODUCT.image) {
  return ['image', 'inspect', image]
}

export function imageBuildArgs(image = MARTIAL_ARTS_PRODUCT.image, dockerfile = MARTIAL_ARTS_PRODUCT.dockerfile) {
  return ['build', '-t', image, '-f', dockerfile, '.']
}

export function ensureLocalImage(
  root = repoRoot(),
  image = MARTIAL_ARTS_PRODUCT.image,
  dockerfile = MARTIAL_ARTS_PRODUCT.dockerfile,
) {
  const inspect = spawnSync('docker', imageInspectArgs(image), {
    cwd: root,
    encoding: 'utf8',
    windowsHide: true,
  })
  if (inspect.status === 0) {
    return { image, built: false }
  }
  const build = spawnSync('docker', imageBuildArgs(image, dockerfile), {
    cwd: root,
    encoding: 'utf8',
    windowsHide: true,
  })
  if (build.status !== 0) {
    throw new Error(build.stderr?.trim() || build.stdout?.trim() || 'Local image build failed.')
  }
  return { image, built: true }
}

export function provisionUpCommand(input: {
  envFileLocal: string
  envFileExample: string
  composeFile: string
  composeProject: string
  root?: string
  filesRoot?: string
  productInstance?: { productId: string }
}) {
  const root = composeRootForEnvironment(input)
  const envFile = resolveComposeEnvFile({
    ...input,
    root,
  })
  return {
    cwd: root,
    args: composeArgs({
      envFile,
      composeFile: input.composeFile,
      composeProject: input.composeProject,
      recreate: false,
    }),
  }
}

export function runProvisionUp(input: Parameters<typeof provisionUpCommand>[0]) {
  const command = provisionUpCommand(input)
  const result = spawnSync('docker', command.args, {
    cwd: command.cwd,
    encoding: 'utf8',
    windowsHide: true,
  })
  if (result.status !== 0) {
    throw new Error(result.stderr?.trim() || result.stdout?.trim() || 'Provision up failed.')
  }
  return { args: command.args, stdout: result.stdout }
}

export async function waitUntilHealthy(healthUrl: string, attempts = 60, delayMs = 3000) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const probe = await probeRegisteredHealth(healthUrl, [healthUrl])
    if (probe.ok) {
      return probe
    }
    await new Promise(resolve => setTimeout(resolve, delayMs))
  }
  throw new Error(`Timed out waiting for ${healthUrl}.`)
}

export async function setLifecycleStatus(db: Database, id: string, lifecycleStatus: 'provisioning' | 'ready' | 'failed' | 'decommissioned') {
  await db.update(environments).set({ lifecycleStatus }).where(eq(environments.id, id))
}

export function environmentProvisionGuard(row: { lifecycleStatus: string } | null) {
  if (!row) {
    return { statusCode: 404, statusMessage: 'Environment not registered.' }
  }
  if (row.lifecycleStatus === 'decommissioned') {
    return { statusCode: 409, statusMessage: 'Decommissioned environments cannot be retried.' }
  }
  return null
}

export function selectEnvironmentsToProvision<T extends {
  id: string
  customerId?: string
  customer?: { id: string }
  productInstance?: { id: string }
  lifecycleStatus: string
}>(rows: readonly T[], customerId: string, onlyIds?: readonly string[], productInstanceId?: string) {
  return rows
    .filter(row => (row.customerId ?? row.customer?.id) === customerId)
    .filter(row => row.lifecycleStatus !== 'decommissioned')
    .filter(row => !onlyIds?.length || onlyIds.includes(row.id))
    .filter(row => !productInstanceId || row.productInstance?.id === productInstanceId)
}

export async function provisionCustomerEnvironments(
  db: Database,
  customerId: string,
  filesRoot?: string,
  onlyIds?: readonly string[],
  productInstanceId?: string,
) {
  const rows = selectEnvironmentsToProvision(
    await listRegisteredEnvironments(db),
    customerId,
    onlyIds,
    productInstanceId,
  )
  if (rows.length === 0) {
    throw new Error('No environments to provision.')
  }
  const images = new Map<string, { image: string, dockerfile: string }>()
  for (const row of rows) {
    const product = requireProduct(row.productInstance.productId)
    images.set(product.image, { image: product.image, dockerfile: product.dockerfile })
  }
  for (const spec of images.values()) {
    ensureLocalImage(repoRoot(), spec.image, spec.dockerfile)
  }
  const results = []
  for (const row of rows) {
    await setLifecycleStatus(db, row.id, 'provisioning')
    try {
      if (row.lifecycleStatus === 'ready') {
        const already = await probeRegisteredHealth(row.healthUrl, [row.healthUrl])
        if (already.ok) {
          await setLifecycleStatus(db, row.id, 'ready')
          results.push({ id: row.id, slug: row.slug, status: 'ready' as const })
          continue
        }
      }
      runProvisionUp({
        envFileLocal: row.envFileLocal,
        envFileExample: row.envFileExample,
        composeFile: row.composeFile,
        composeProject: row.composeProject,
        filesRoot,
        productInstance: row.productInstance,
      })
      await waitUntilHealthy(row.healthUrl)
      await setLifecycleStatus(db, row.id, 'ready')
      results.push({ id: row.id, slug: row.slug, status: 'ready' as const })
    } catch (error) {
      await setLifecycleStatus(db, row.id, 'failed')
      results.push({
        id: row.id,
        slug: row.slug,
        status: 'failed' as const,
        error: error instanceof Error ? error.message : 'Provision failed.',
      })
    }
  }
  return results
}
