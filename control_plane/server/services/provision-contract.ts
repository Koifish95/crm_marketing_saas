export const PROVISIONED_IMAGE = 'martial-arts-acquisition:s4'
export const PROVISIONED_COMPOSE_FILE = 'docker-compose.provisioned.yml'
export const HOST_PORT_MIN = 52200
export const HOST_PORT_MAX = 52999
export const DEFAULT_TIMEZONE = 'America/Denver'

const CUSTOMER_SLUG = /^[a-z][a-z0-9-]{1,46}[a-z0-9]$/
const RESERVED = /^(lab-acme|renzo|martial-arts|webhosting)(-|$)/i

export const NON_PROD_TYPES = ['DEV', 'STAGE', 'UAT', 'TRAINING'] as const
export type NonProdEnvironmentType = typeof NON_PROD_TYPES[number]
export type EnvironmentType = 'PROD' | NonProdEnvironmentType

const ENV_LABEL = /^[a-z][a-z0-9-]{1,30}[a-z0-9]$/

export function normalizeCustomerSlug(value: string) {
  return value.trim().toLowerCase()
}

export function assertProvisionSlug(slug: string) {
  const normalized = normalizeCustomerSlug(slug)
  if (!CUSTOMER_SLUG.test(normalized) || normalized.includes('--')) {
    throw new Error(`Invalid customer slug ${slug}. Use lowercase letters, numbers, and single hyphens.`)
  }
  if (RESERVED.test(normalized) || normalized.includes('renzo') || normalized.includes('webhosting')) {
    throw new Error(`Refusing reserved slug ${normalized}.`)
  }
  return normalized
}

export function environmentNames(customerSlug: string, type: EnvironmentType) {
  const slug = `${assertProvisionSlug(customerSlug)}-${type.toLowerCase()}`
  return {
    type,
    displayName: type,
    slug,
    containerName: `${slug}-app`,
    composeProject: slug,
    composeFile: PROVISIONED_COMPOSE_FILE,
    sqliteVolume: `${slug}-sqlite`,
    assetsVolume: `${slug}-assets`,
    isolationMarker: `${slug}-isolation`,
    expectedImage: PROVISIONED_IMAGE,
  }
}

export function defaultEnvironmentPair(customerSlug: string) {
  return [environmentNames(customerSlug, 'PROD'), environmentNames(customerSlug, 'DEV')] as const
}

export function normalizeEnvironmentLabel(value: string) {
  return value.trim().toLowerCase().replace(/[\s_]+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/--+/g, '-').replace(/^-|-$/g, '')
}

export function extraEnvironmentNames(
  customerSlug: string,
  type: NonProdEnvironmentType,
  displayName: string,
) {
  if ((type as string) === 'PROD') {
    throw new Error('Extra environments must be non-PROD.')
  }
  const customer = assertProvisionSlug(customerSlug)
  const raw = displayName.trim() || type
  const label = normalizeEnvironmentLabel(raw)
  if (!ENV_LABEL.test(label) || label.includes('--')) {
    throw new Error(`Invalid extra environment name ${displayName}.`)
  }
  if (label === 'prod') {
    throw new Error('Extra environments must be non-PROD.')
  }
  const slug = `${customer}-${label}`
  if (RESERVED.test(slug) || slug.includes('renzo') || slug.includes('webhosting')) {
    throw new Error(`Refusing reserved slug ${slug}.`)
  }
  return {
    type,
    displayName: raw,
    slug,
    containerName: `${slug}-app`,
    composeProject: slug,
    composeFile: PROVISIONED_COMPOSE_FILE,
    sqliteVolume: `${slug}-sqlite`,
    assetsVolume: `${slug}-assets`,
    isolationMarker: `${slug}-isolation`,
    expectedImage: PROVISIONED_IMAGE,
  }
}

export function healthUrlForPort(port: number) {
  if (!Number.isInteger(port) || port < HOST_PORT_MIN || port > HOST_PORT_MAX) {
    throw new Error(`Host port ${port} is outside ${HOST_PORT_MIN}–${HOST_PORT_MAX}.`)
  }
  return `http://127.0.0.1:${port}/api/health`
}

export function accessUrlForPort(port: number) {
  if (!Number.isInteger(port) || port < 1) {
    throw new Error(`Host port ${port} is not a positive access port.`)
  }
  return `http://localhost:${port}`
}

export function allocateHostPorts(used: readonly number[], count = 2) {
  const taken = new Set(used)
  const ports: number[] = []
  for (let port = HOST_PORT_MIN; port <= HOST_PORT_MAX && ports.length < count; port += 1) {
    if (!taken.has(port)) {
      ports.push(port)
      taken.add(port)
    }
  }
  if (ports.length < count) {
    throw new Error('No free host ports left in the provision range.')
  }
  return ports
}
