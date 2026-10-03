import { existsSync, readFileSync } from 'node:fs'
import { isAbsolute, resolve } from 'node:path'

type RegisteredQaEnvironment = {
  id: string
  slug: string
  envFileLocal: string
}

export function selectQaEnvironment<T extends RegisteredQaEnvironment>(environments: T[], selector: string) {
  const matches = environments.filter(environment => environment.id === selector || environment.slug === selector)
  if (matches.length === 0) throw new Error(`Registered environment "${selector}" was not found.`)
  if (matches.length > 1) throw new Error(`Registered environment selector "${selector}" is ambiguous.`)
  return matches[0]!
}

function parseEnvValue(raw: string) {
  const value = raw.trim()
  if (value.startsWith('"') && value.endsWith('"')) {
    try {
      return JSON.parse(value) as string
    } catch {
      throw new Error('The registered credential file contains an invalid quoted value.')
    }
  }
  if (value.startsWith('\'') && value.endsWith('\'')) return value.slice(1, -1)
  return value
}

export function readQaCredentialsFromEnvironmentFile(environment: RegisteredQaEnvironment, composeRoot: string) {
  const path = isAbsolute(environment.envFileLocal)
    ? environment.envFileLocal
    : resolve(composeRoot, environment.envFileLocal)
  if (!existsSync(path)) {
    throw new Error(`The registered local environment file is unavailable for ${environment.slug}. Supply QA_USERNAME and QA_PASSWORD instead.`)
  }
  const values = new Map<string, string>()
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
    if (match && !match[1]!.startsWith('#')) values.set(match[1]!, parseEnvValue(match[2]!))
  }
  const username = values.get('NUXT_AUTH_USERNAME')?.trim()
  const password = values.get('NUXT_AUTH_PASSWORD')?.trim()
  if (!username || !password) {
    throw new Error(`The registered local environment file for ${environment.slug} does not contain QA-capable authentication values. Supply QA_USERNAME and QA_PASSWORD instead.`)
  }
  return { username, password }
}
