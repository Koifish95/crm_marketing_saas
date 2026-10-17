import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { eq } from 'drizzle-orm'
import type { Database } from '../database'
import { environments } from '../database/schema'
import { MARTIAL_ARTS_PRODUCT, requireProduct } from '../products/catalog'
import {
  digestImageRef,
  imageRepository,
  immutableImageTag,
  normalizeImageId,
  releaseIdentity,
} from '../../shared/utils/image-identity'
import {
  composeArgs,
  composeRootForEnvironment,
  dockerFailureMessage,
  repoRoot,
  resolveComposeEnvFile,
  spawnDocker,
} from './docker-relaunch'
import { probeRegisteredHealth } from './health'
import { localHostingNodeSpec } from './hosting-node'
import { redactLeadIntakeKey } from './lead-intake-key'
import { patchProvisionedEnvFile, provisionedEnvAbsolutePath } from './provision-env'
import { listRegisteredEnvironments } from './registry'
import { autoAssignPublicHostname } from './public-hostname'
import { recordOperatorEvent } from './operator-events'

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

export function currentReleaseId(env: NodeJS.Dict<string | undefined> = process.env) {
  return (env.RELEASE_ID || env.GIT_SHA || 'dev').trim() || 'dev'
}

export function sourceReleaseId(root = repoRoot(), env: NodeJS.Dict<string | undefined> = process.env) {
  const fromEnv = (env.RELEASE_ID || env.GIT_SHA || '').trim()
  if (fromEnv && fromEnv !== 'dev') {
    return fromEnv
  }
  const git = spawnSync('git', ['rev-parse', '--short=12', 'HEAD'], {
    cwd: root,
    encoding: 'utf8',
    windowsHide: true,
  })
  const sha = (git.stdout || '').trim()
  if (git.status === 0 && /^[0-9a-f]{7,40}$/.test(sha)) {
    return sha
  }
  return 'dev'
}

export function imageBuildArgs(
  image = MARTIAL_ARTS_PRODUCT.image,
  dockerfile = MARTIAL_ARTS_PRODUCT.dockerfile,
  releaseId = currentReleaseId(),
) {
  return ['build', '-t', image, '-f', dockerfile, '--build-arg', `RELEASE_ID=${releaseId}`, '.']
}

export type CommandResult = { status: number | null, stdout: string, stderr: string, error?: Error }
export type CommandRunner = (command: 'git' | 'docker', args: readonly string[], cwd: string) => CommandResult

export const defaultCommandRunner: CommandRunner = (command, args, cwd) => {
  const result = command === 'docker'
    ? spawnDocker(args, cwd)
    : spawnSync('git', [...args], { cwd, encoding: 'utf8', windowsHide: true })
  return {
    status: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    error: result.error,
  }
}

/** Workspace files every product image also builds from. */
export const SHARED_SOURCE_PATHS = ['packages', 'package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml'] as const

export function gitHeadSha(root: string, run: CommandRunner = defaultCommandRunner) {
  const head = run('git', ['rev-parse', '--short=12', 'HEAD'], root)
  const sha = head.stdout.trim()
  return head.status === 0 && /^[0-9a-f]{7,40}$/.test(sha) ? sha : ''
}

export function productSourceDirty(root: string, templateDir: string, run: CommandRunner = defaultCommandRunner) {
  const status = run('git', ['status', '--porcelain', '--', templateDir, ...SHARED_SOURCE_PATHS], root)
  return status.status !== 0 || status.stdout.trim().length > 0
}

export type ProvisionImage = {
  expectedImage: string
  releaseId: string
  imageId: string
  built: boolean
  /** True when the image came from the CI registry instead of a build on this host. */
  pulled: boolean
}

export type ProvisionImageSpec = { image: string, dockerfile: string, templateDir: string, registryImage?: string }

function imageConfigEnv(ref: string, root: string, run: CommandRunner, key: string) {
  const text = run('docker', ['image', 'inspect', '-f', '{{range .Config.Env}}{{println .}}{{end}}', ref], root).stdout
  const line = text.split('\n').find(item => item.startsWith(`${key}=`))
  return line ? line.slice(key.length + 1).trim() : ''
}

/**
 * Use the CI image for a clean commit: already pulled, or pulled now.
 * Returns null when the registry has no image for this commit (not pushed, CI not green yet, or no access).
 */
function pullRegistryImage(registryImage: string, sha: string, root: string, run: CommandRunner) {
  const ref = `${registryImage}:${sha}`
  if (run('docker', imageInspectArgs(ref), root).status !== 0 && run('docker', ['pull', ref], root).status !== 0) {
    return null
  }
  const baked = imageConfigEnv(ref, root, run, 'RELEASE_ID')
  if (baked !== sha) {
    throw new Error(`Registry image ${ref} carries RELEASE_ID ${baked || 'none'}, not ${sha}. Refusing it.`)
  }
  return ref
}

/**
 * Resolve the product image for the checked-out commit and return its digest identity.
 * A clean commit uses the CI image from the registry when there is one; otherwise this host builds it.
 * The commit tag is reused only for a clean tree, so one tag always means one source.
 * A VPS refuses uncommitted product source: deploy a commit first.
 */
export function resolveProvisionImage(
  spec: ProvisionImageSpec,
  options: { root?: string, nodeKind?: string, run?: CommandRunner } = {},
): ProvisionImage {
  const root = options.root ?? repoRoot()
  const run = options.run ?? defaultCommandRunner
  const sha = gitHeadSha(root, run)
  if (!sha) {
    throw new Error('Cannot read the git commit of the checkout. Refusing to build an image with no release id.')
  }
  const dirty = productSourceDirty(root, spec.templateDir, run)
  if (dirty && options.nodeKind === 'vps') {
    throw new Error(`${spec.templateDir} has uncommitted changes on this host. Deploy a clean commit first (pnpm vps deploy).`)
  }
  const source = dirty ? `${sha}-dirty` : sha
  const pulledRef = !dirty && spec.registryImage ? pullRegistryImage(spec.registryImage, sha, root, run) : null
  if (pulledRef && spec.registryImage) {
    const imageId = normalizeImageId(run('docker', ['image', 'inspect', '-f', '{{.Id}}', pulledRef], root).stdout)
    if (!imageId) {
      throw new Error(`Image ${pulledRef} has no sha256 id.`)
    }
    const releaseId = releaseIdentity(sha, imageId)
    run('docker', ['tag', imageId, immutableImageTag(spec.registryImage, releaseId)], root)
    return { expectedImage: digestImageRef(spec.registryImage, imageId), releaseId, imageId, built: false, pulled: true }
  }
  const repository = imageRepository(spec.image)
  const commitTag = `${repository}:${source}`
  let built = false
  if (dirty || run('docker', imageInspectArgs(commitTag), root).status !== 0) {
    const build = run('docker', imageBuildArgs(commitTag, spec.dockerfile, source), root)
    if (build.status !== 0 || build.error) {
      throw new Error((build.error?.message || `${build.stderr}\n${build.stdout}`.trim() || 'Local image build failed.').slice(-4000))
    }
    built = true
  }
  const imageId = normalizeImageId(run('docker', ['image', 'inspect', '-f', '{{.Id}}', commitTag], root).stdout)
  if (!imageId) {
    throw new Error(`Image ${commitTag} has no sha256 id.`)
  }
  const releaseId = releaseIdentity(source, imageId)
  run('docker', ['tag', imageId, immutableImageTag(repository, releaseId)], root)
  return { expectedImage: digestImageRef(repository, imageId), releaseId, imageId, built, pulled: false }
}

/** Point a provisioned env file at the pinned image before compose up. Lab rows without a provisioned file are left alone. */
export function pinProvisionedEnvFile(envFileLocal: string, image: ProvisionImage, filesRoot?: string) {
  const path = provisionedEnvAbsolutePath(envFileLocal, filesRoot)
  if (!existsSync(path)) {
    return false
  }
  patchProvisionedEnvFile(envFileLocal, { EXPECTED_IMAGE: image.expectedImage, RELEASE_ID: image.releaseId }, filesRoot)
  return true
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
    provisionError: lifecycleStatus === 'failed' && provisionError ? redactLeadIntakeKey(provisionError) : null,
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

export function productImageSpec(product: ProvisionImageSpec): ProvisionImageSpec {
  return { image: product.image, dockerfile: product.dockerfile, templateDir: product.templateDir, registryImage: product.registryImage }
}

export function imageSpecsForRows(rows: readonly { productInstance: { productId: string } }[]) {
  const images = new Map<string, ProvisionImageSpec>()
  for (const row of rows) {
    const product = requireProduct(row.productInstance.productId)
    images.set(product.image, productImageSpec(product))
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
  const images = new Map<string, ProvisionImage>()
  const nodeKind = localHostingNodeSpec().kind
  for (const spec of imageSpecsForRows(rows).values()) {
    try {
      images.set(spec.image, resolveProvisionImage(spec, { root: repoRoot(), nodeKind }))
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
      // Before compose up, so the container starts with its public origin and no relaunch is needed.
      const hostname = await autoAssignPublicHostname(db, row, { filesRoot })
      if (hostname) {
        await recordOperatorEvent(db, {
          action: 'public-hostname',
          summary: 'error' in hostname
            ? `${row.slug} hostname ${hostname.hostname} not assigned: ${hostname.error}`
            : `${row.slug} → https://${hostname.hostname} (certificate ${hostname.certificate.status})`,
          customerId: row.customer.id,
          productInstanceId: row.productInstance.id,
          environmentId: row.id,
          detail: 'error' in hostname
            ? { hostname: hostname.hostname, error: hostname.error }
            : { hostname: hostname.hostname, certificate: hostname.certificate },
        })
      }
      const image = images.get(product.image)
      if (image && pinProvisionedEnvFile(row.envFileLocal, image, filesRoot)) {
        await db.update(environments).set({ expectedImage: image.expectedImage }).where(eq(environments.id, row.id))
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
