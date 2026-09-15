import { eq } from 'drizzle-orm'
import type { Database } from '../database'
import { environments } from '../database/schema'
import { MARTIAL_ARTS_PRODUCT, requireProduct } from '../products/catalog'
import {
  composeArgs,
  composeRootForEnvironment,
  dockerFailureMessage,
  repoRoot,
  resolveComposeEnvFile,
  spawnDocker,
} from './docker-relaunch'
import { probeRegisteredHealth } from './health'
import { listRegisteredEnvironments } from './registry'

const provisionLocks = new Set<string>()

export type ProvisionRun = (
  db: Database,
  customerId: string,
  filesRoot?: string,
  onlyIds?: readonly string[],
  productInstanceId?: string,
) => Promise<unknown>

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
  const inspect = spawnDocker(imageInspectArgs(image), root)
  if (inspect.status === 0) {
    return { image, built: false }
  }
  const build = spawnDocker(imageBuildArgs(image, dockerfile), root)
  if (build.status !== 0 || build.error) {
    throw new Error(dockerFailureMessage(build, 'Local image build failed.'))
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
  const result = spawnDocker(command.args, command.cwd)
  if (result.status !== 0 || result.error) {
    throw new Error(dockerFailureMessage(result, 'Provision up failed.'))
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

export async function setLifecycleStatus(
  db: Database,
  id: string,
  lifecycleStatus: 'provisioning' | 'ready' | 'failed' | 'decommissioned',
  provisionError: string | null = null,
) {
  await db.update(environments).set({
    lifecycleStatus,
    provisionError: lifecycleStatus === 'failed' ? provisionError : null,
  }).where(eq(environments.id, id))
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

export function imageSpecsForRows(rows: readonly { productInstance: { productId: string } }[]) {
  const images = new Map<string, { image: string, dockerfile: string }>()
  for (const row of rows) {
    const product = requireProduct(row.productInstance.productId)
    images.set(product.image, { image: product.image, dockerfile: product.dockerfile })
  }
  return images
}

export async function recordProvisionFailure(
  db: Database,
  row: { id: string, slug: string },
  error: string,
) {
  await setLifecycleStatus(db, row.id, 'failed', error)
  return { id: row.id, slug: row.slug, status: 'failed' as const, error }
}

export function startBackgroundProvision(
  db: Database,
  customerId: string,
  filesRoot?: string,
  onlyIds?: readonly string[],
  productInstanceId?: string,
  run: ProvisionRun = provisionCustomerEnvironments,
) {
  if (provisionLocks.has(customerId)) {
    return { accepted: true as const, started: false as const }
  }
  provisionLocks.add(customerId)
  void Promise.resolve()
    .then(() => run(db, customerId, filesRoot, onlyIds, productInstanceId))
    .catch((error) => {
      console.error(`[provision] ${customerId}`, error)
    })
    .finally(() => {
      provisionLocks.delete(customerId)
    })
  return { accepted: true as const, started: true as const }
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
  const imageErrors = new Map<string, string>()
  for (const spec of imageSpecsForRows(rows).values()) {
    try {
      ensureLocalImage(repoRoot(), spec.image, spec.dockerfile)
    } catch (error) {
      imageErrors.set(spec.image, error instanceof Error ? error.message : 'Local image build failed.')
    }
  }
  const results = []
  for (const row of rows) {
    const product = requireProduct(row.productInstance.productId)
    const imageError = imageErrors.get(product.image)
    if (imageError) {
      results.push(await recordProvisionFailure(db, row, imageError))
      continue
    }
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
      results.push(await recordProvisionFailure(
        db,
        row,
        error instanceof Error ? error.message : 'Provision failed.',
      ))
    }
  }
  return results
}
