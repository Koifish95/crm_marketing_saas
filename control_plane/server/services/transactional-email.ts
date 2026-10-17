import { patchEnvFileContents, readEnvValue } from './provision-env'

/**
 * The fleet-wide transactional email sender (Resend), set once in the Control Plane's own
 * env file (/etc/sic/control-plane.env) and copied into each environment of a product that
 * sends transactional email. Transactional only: prospect outreach never uses it.
 */
export const RESEND_API_KEY_NAME = 'RESEND_API_KEY'
export const NOTIFY_FROM_NAME = 'NOTIFY_FROM'

/** The values to give an environment; empty when the Control Plane has no key. */
export function transactionalEmailEnv(env: NodeJS.ProcessEnv = process.env): Record<string, string> {
  const key = env[RESEND_API_KEY_NAME]?.trim()
  if (!key) {
    return {}
  }
  const from = env[NOTIFY_FROM_NAME]?.trim()
  return { [RESEND_API_KEY_NAME]: key, ...(from ? { [NOTIFY_FROM_NAME]: from } : {}) }
}

/**
 * Brings an environment's env file in line with the Control Plane's sender, so a new or
 * rotated key reaches it on upgrade. Without a Control Plane key the file is left alone.
 */
export function withTransactionalEmail(contents: string, env: NodeJS.ProcessEnv = process.env) {
  const wanted = transactionalEmailEnv(env)
  const updates = Object.fromEntries(Object.entries(wanted).filter(([key, value]) => readEnvValue(contents, key) !== value))
  if (!Object.keys(updates).length) {
    return { contents, changed: false }
  }
  return { contents: patchEnvFileContents(contents, updates), changed: true }
}
