import { existsSync, readFileSync, rmSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import { patchEnvFileContents, readEnvValue, writeSecretFile } from './provision-env'

export const LEAD_INTAKE_KEY_NAME = 'LEAD_INTAKE_KEY'
export const REDACTED = '[redacted]'

/** 32 random bytes, base64url (43 characters). */
export function generateLeadIntakeKey() {
  return randomBytes(32).toString('base64url')
}

/** The marker means "this key has been generated and the operator has not seen it yet". */
export function pendingRevealPath(envPath: string) {
  return `${envPath}.lead-intake-reveal`
}

export function markLeadIntakeKeyPending(envPath: string) {
  writeSecretFile(pendingRevealPath(envPath), 'pending\n')
}

export function clearLeadIntakeKeyPending(envPath: string) {
  rmSync(pendingRevealPath(envPath), { force: true })
}

export function readLeadIntakeKey(contents: string) {
  return readEnvValue(contents, LEAD_INTAKE_KEY_NAME)
}

/** Adds a key only when none exists. Never overwrites. */
export function withLeadIntakeKeyBackfill(contents: string) {
  if (readLeadIntakeKey(contents)) {
    return { contents, created: false }
  }
  return {
    contents: patchEnvFileContents(contents, { [LEAD_INTAKE_KEY_NAME]: generateLeadIntakeKey() }),
    created: true,
  }
}

/** Returns the key once. A second call finds no marker and returns null. */
export function consumeLeadIntakeKeyReveal(envPath: string) {
  const marker = pendingRevealPath(envPath)
  if (!existsSync(marker) || !existsSync(envPath)) {
    return null
  }
  const key = readLeadIntakeKey(readFileSync(envPath, 'utf8'))
  if (!key) {
    return null
  }
  rmSync(marker, { force: true })
  return key
}

/** Strips key assignments (and any known key values) from text bound for logs, events, or stored errors. */
export function redactLeadIntakeKey(text: string, ...knownKeys: string[]) {
  let out = text.replace(/(LEAD_INTAKE_KEY["']?\s*[=:]\s*)("[^"]*"|'[^']*'|[^\s,"']+)/g, `$1${REDACTED}`)
  for (const key of knownKeys) {
    if (key) {
      out = out.split(key).join(REDACTED)
    }
  }
  return out
}

export function redactDeep<T>(value: T): T {
  if (typeof value === 'string') {
    return redactLeadIntakeKey(value) as T
  }
  if (Array.isArray(value)) {
    return value.map(item => redactDeep(item)) as T
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [
      k,
      k === LEAD_INTAKE_KEY_NAME || k === 'leadIntakeKey' ? REDACTED : redactDeep(v),
    ])) as T
  }
  return value
}
