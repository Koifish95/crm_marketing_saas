import { describe, expect, it } from 'vitest'
import { DOCKER_SPAWN_MAX_BUFFER, dockerSpawnOptions } from '../../server/services/docker-relaunch'
import { PROVISIONED_IMAGE } from '../../server/services/provision-contract'
import { environmentProvisionGuard, imageBuildArgs, imageInspectArgs, imageSpecsForRows, provisionUpCommand, selectEnvironmentsToProvision, startBackgroundProvision } from '../../server/services/provision-runtime'

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
