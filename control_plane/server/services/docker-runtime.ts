import { spawnSync } from 'node:child_process'

const CONTAINER_NAME = /^[a-z0-9][a-z0-9-]{2,62}$/

export type RuntimeState = 'running' | 'stopped' | 'missing' | 'unknown'

export function assertRegisteredContainerName(name: string, registered: readonly string[]) {
  if (!CONTAINER_NAME.test(name) || !registered.includes(name)) {
    throw new Error(`Refusing Docker inspect for ${name}. Exact registered container names only.`)
  }
}

export function runtimeFromInspect(status: number, stdout: string, stderr: string): RuntimeState {
  const text = `${stdout}\n${stderr}`.toLowerCase()
  if (status !== 0 && (text.includes('no such object') || text.includes('no such container'))) {
    return 'missing'
  }
  if (status !== 0) {
    return 'unknown'
  }
  const running = stdout.trim().toLowerCase()
  if (running === 'true') {
    return 'running'
  }
  if (running === 'false') {
    return 'stopped'
  }
  return 'unknown'
}

export function inspectRegisteredContainer(containerName: string, registered: readonly string[]): RuntimeState {
  assertRegisteredContainerName(containerName, registered)
  const result = spawnSync('docker', ['inspect', '-f', '{{.State.Running}}', containerName], {
    encoding: 'utf8',
    windowsHide: true,
  })
  return runtimeFromInspect(result.status ?? 1, result.stdout ?? '', result.stderr ?? '')
}
