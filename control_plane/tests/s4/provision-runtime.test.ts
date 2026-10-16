import { describe, expect, it } from 'vitest'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DOCKER_SPAWN_MAX_BUFFER, dockerSpawnOptions } from '../../server/services/docker-relaunch'
import { PROVISIONED_IMAGE } from '../../server/services/provision-contract'
import { type CommandRunner, environmentProvisionGuard, imageBuildArgs, imageInspectArgs, imageSpecsForRows, pinProvisionedEnvFile, provisionUpCommand, resolveProvisionImage, selectEnvironmentsToProvision, startBackgroundProvision } from '../../server/services/provision-runtime'

describe('S4 provision runtime commands', () => {
  it('builds the local s4 image and ups without -v', () => {
    expect(imageInspectArgs()).toEqual(['image', 'inspect', PROVISIONED_IMAGE])
    expect(imageBuildArgs()).toEqual(['build', '-t', PROVISIONED_IMAGE, '-f', 'martial_arts_template/Dockerfile', '--build-arg', 'RELEASE_ID=dev', '.'])
    expect(imageBuildArgs('crm-sales:c2', 'sales_template/Dockerfile')).toEqual([
      'build',
      '-t',
      'crm-sales:c2',
      '-f',
      'sales_template/Dockerfile',
      '--build-arg',
      'RELEASE_ID=dev',
      '.',
    ])
    const command = provisionUpCommand({
      envFileLocal: 'C:/tmp/missing.env',
      envFileExample: 'C:/tmp/missing.env',
      composeFile: 'docker-compose.provisioned.yml',
      composeProject: 'strategic-insights-prod',
      root: 'C:/tmp/missing-template',
    })
    expect(command.args).toEqual([
      'compose',
      '--env-file',
      'C:/tmp/missing.env',
      '-f',
      'docker-compose.provisioned.yml',
      '-p',
      'strategic-insights-prod',
      'up',
      '-d',
      '--no-deps',
      'app',
    ])
    expect(command.args.join(' ')).not.toMatch(/-v|prune|down/)
    expect(DOCKER_SPAWN_MAX_BUFFER).toBeGreaterThan(1024 * 1024)
    expect(dockerSpawnOptions('C:/tmp').maxBuffer).toBe(DOCKER_SPAWN_MAX_BUFFER)
    expect([...imageSpecsForRows([
      { productInstance: { productId: 'sales' } },
      { productInstance: { productId: 'martial-arts' } },
    ]).keys()]).toEqual(['crm-sales:c2', 'martial-arts-acquisition:s4'])
  })

  it('refuses decommissioned environment retry and limits provision to onlyIds', () => {
    expect(environmentProvisionGuard(null)).toEqual({
      statusCode: 404,
      statusMessage: 'Environment not registered.',
    })
    expect(environmentProvisionGuard({ lifecycleStatus: 'decommissioned' })).toEqual({
      statusCode: 409,
      statusMessage: 'Decommissioned environments cannot be retried.',
    })
    expect(environmentProvisionGuard({ lifecycleStatus: 'failed' })).toBeNull()

    const rows = [
      { id: 'prod', customerId: 'c1', lifecycleStatus: 'failed' },
      { id: 'dev', customerId: 'c1', lifecycleStatus: 'provisioning' },
      { id: 'gone', customerId: 'c1', lifecycleStatus: 'decommissioned' },
      { id: 'other', customerId: 'c2', lifecycleStatus: 'failed' },
    ]
    expect(selectEnvironmentsToProvision(rows, 'c1').map(row => row.id)).toEqual(['prod', 'dev'])
    expect(selectEnvironmentsToProvision(rows, 'c1', ['dev']).map(row => row.id)).toEqual(['dev'])
    expect(selectEnvironmentsToProvision(rows, 'c1', ['gone'])).toEqual([])
  })

  it('accepts one in-flight provision per customer and ignores a duplicate start', async () => {
    let release: (() => void) | undefined
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    const run = async () => {
      await gate
      return []
    }
    const first = startBackgroundProvision({} as never, 'cust-lock', undefined, undefined, undefined, run)
    const second = startBackgroundProvision({} as never, 'cust-lock', undefined, undefined, undefined, run)
    expect(first).toEqual({ accepted: true, started: true })
    expect(second).toEqual({ accepted: true, started: false })
    release?.()
    await gate
    await new Promise(resolve => setTimeout(resolve, 20))
    const third = startBackgroundProvision({} as never, 'cust-lock', undefined, undefined, undefined, async () => [])
    expect(third.started).toBe(true)
    await new Promise(resolve => setTimeout(resolve, 20))
  })
})

describe('provision image release identity', () => {
  const SHA = '0123456789ab'
  const ID = `sha256:${'d'.repeat(64)}`
  const spec = { image: 'crm-sales:c2', dockerfile: 'sales_template/Dockerfile', templateDir: 'sales_template' }

  function fakeRunner(options: { dirty?: boolean, tagExists?: boolean, head?: string, registry?: { local?: boolean, pull?: boolean, baked?: string } }) {
    const calls: string[] = []
    const run: CommandRunner = (command, args) => {
      calls.push(`${command} ${args.join(' ')}`)
      if (args[0] === 'pull') {
        return { status: options.registry?.pull ? 0 : 1, stdout: '', stderr: 'denied' }
      }
      if (args[0] === 'image' && args[1] === 'inspect' && args[2]?.startsWith('ghcr.io/')) {
        return { status: options.registry?.local ? 0 : 1, stdout: '', stderr: '' }
      }
      if (args[0] === 'image' && args[2] === '-f' && args[3]?.includes('.Config.Env')) {
        return { status: 0, stdout: `PATH=/usr/bin
RELEASE_ID=${options.registry?.baked ?? SHA}
`, stderr: '' }
      }
      if (command === 'git' && args[0] === 'rev-parse') {
        return { status: 0, stdout: `${options.head ?? SHA}\n`, stderr: '' }
      }
      if (command === 'git') {
        return { status: 0, stdout: options.dirty ? ' M sales_template/app.vue\n' : '', stderr: '' }
      }
      if (args[0] === 'image' && args[1] === 'inspect' && args[2] !== '-f') {
        return { status: options.tagExists ? 0 : 1, stdout: '', stderr: '' }
      }
      if (args[0] === 'image' && args[2] === '-f') {
        return { status: 0, stdout: `${ID}\n`, stderr: '' }
      }
      return { status: 0, stdout: '', stderr: '' }
    }
    return { run, calls }
  }

  it('builds a commit-tagged image and returns a digest pin with a real release id', () => {
    const { run, calls } = fakeRunner({})
    const image = resolveProvisionImage(spec, { root: '/repo', nodeKind: 'vps', run })
    expect(image).toEqual({
      expectedImage: `crm-sales@${ID}`,
      releaseId: `${SHA}@dddddddddddd`,
      imageId: ID,
      built: true,
      pulled: false,
    })
    expect(calls).toContain(`docker build -t crm-sales:${SHA} -f sales_template/Dockerfile --build-arg RELEASE_ID=${SHA} .`)
    expect(calls).toContain(`docker tag ${ID} crm-sales:${SHA}-dddddddddddd`)
    expect(calls.some(call => call.includes('status --porcelain -- sales_template packages'))).toBe(true)
  })

  it('reuses the commit tag on a clean tree', () => {
    const { run, calls } = fakeRunner({ tagExists: true })
    expect(resolveProvisionImage(spec, { root: '/repo', nodeKind: 'vps', run }).built).toBe(false)
    expect(calls.some(call => call.startsWith('docker build'))).toBe(false)
  })

  it('refuses uncommitted product source on a VPS and marks it dirty on a laptop', () => {
    expect(() => resolveProvisionImage(spec, { root: '/repo', nodeKind: 'vps', run: fakeRunner({ dirty: true }).run }))
      .toThrow(/uncommitted changes/)
    const laptop = fakeRunner({ dirty: true, tagExists: true })
    const image = resolveProvisionImage(spec, { root: '/repo', nodeKind: 'laptop', run: laptop.run })
    expect(image.releaseId).toBe(`${SHA}-dirty@dddddddddddd`)
    expect(image.built).toBe(true)
  })

  const registrySpec = { ...spec, registryImage: 'ghcr.io/koifish95/crm-sales' }

  it('pulls the CI image for a clean commit and pins its registry digest', () => {
    const { run, calls } = fakeRunner({ registry: { pull: true } })
    expect(resolveProvisionImage(registrySpec, { root: '/repo', nodeKind: 'vps', run })).toEqual({
      expectedImage: `ghcr.io/koifish95/crm-sales@${ID}`,
      releaseId: `${SHA}@dddddddddddd`,
      imageId: ID,
      built: false,
      pulled: true,
    })
    expect(calls).toContain(`docker pull ghcr.io/koifish95/crm-sales:${SHA}`)
    expect(calls).toContain(`docker tag ${ID} ghcr.io/koifish95/crm-sales:${SHA}-dddddddddddd`)
    expect(calls.some(call => call.startsWith('docker build'))).toBe(false)
  })

  it('reuses an already pulled CI image without pulling again', () => {
    const { run, calls } = fakeRunner({ registry: { local: true } })
    expect(resolveProvisionImage(registrySpec, { root: '/repo', nodeKind: 'vps', run }).pulled).toBe(true)
    expect(calls.some(call => call.startsWith('docker pull'))).toBe(false)
  })

  it('builds on this host when the registry has no image for the commit', () => {
    const { run, calls } = fakeRunner({ registry: { pull: false } })
    const image = resolveProvisionImage(registrySpec, { root: '/repo', nodeKind: 'vps', run })
    expect(image).toMatchObject({ expectedImage: `crm-sales@${ID}`, built: true, pulled: false })
    expect(calls).toContain(`docker build -t crm-sales:${SHA} -f sales_template/Dockerfile --build-arg RELEASE_ID=${SHA} .`)
  })

  it('never pulls for dirty laptop source and refuses a registry image built from another commit', () => {
    const laptop = fakeRunner({ dirty: true, registry: { pull: true } })
    expect(resolveProvisionImage(registrySpec, { root: '/repo', nodeKind: 'laptop', run: laptop.run }).pulled).toBe(false)
    expect(laptop.calls.some(call => call.startsWith('docker pull'))).toBe(false)
    expect(() => resolveProvisionImage(registrySpec, { root: '/repo', nodeKind: 'vps', run: fakeRunner({ registry: { pull: true, baked: 'ffffffffffff' } }).run }))
      .toThrow(/RELEASE_ID ffffffffffff/)
  })

  it('refuses a checkout with no readable commit', () => {
    expect(() => resolveProvisionImage(spec, { root: '/repo', run: fakeRunner({ head: 'not-a-sha' }).run }))
      .toThrow(/no release id/)
  })

  it('pins an existing provisioned env file and skips a missing one', () => {
    const root = mkdtempSync(join(tmpdir(), 'pin-env-'))
    try {
      const envFile = 'data/provisioned/x.env'
      mkdirSync(join(root, 'data/provisioned'), { recursive: true })
      writeFileSync(join(root, envFile), 'EXPECTED_IMAGE="crm-sales:c2"\nRELEASE_ID="dev"\nHOST_PORT="52203"\n')
      const image = { expectedImage: `crm-sales@${ID}`, releaseId: `${SHA}@dddddddddddd`, imageId: ID, built: true, pulled: false }
      expect(pinProvisionedEnvFile(envFile, image, root)).toBe(true)
      const text = readFileSync(join(root, envFile), 'utf8')
      expect(text).toContain(`EXPECTED_IMAGE="crm-sales@${ID}"`)
      expect(text).toContain(`RELEASE_ID="${SHA}@dddddddddddd"`)
      expect(text).toContain('HOST_PORT="52203"')
      expect(pinProvisionedEnvFile('data/provisioned/missing.env', image, root)).toBe(false)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})
