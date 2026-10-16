import { spawnSync } from 'node:child_process'
import { join } from 'node:path'
import { repoRoot } from './docker-relaunch'
import { hostnameHasCertificate } from './production-edge'

export type CertificateIssuer = (hostname: string, edgeDir: string) => { ok: boolean, message: string }

export type CertificateResult = {
  status: 'present' | 'issued' | 'failed' | 'skipped'
  message?: string
}

/** On a hosting node with a public edge (the VPS), hostname assignment also issues its Let's Encrypt certificate. */
export function autoCertificateEnabled(env: NodeJS.Dict<string | undefined> = process.env) {
  return /^(?:1|true|yes)$/i.test((env.EDGE_AUTO_CERT || '').trim())
}

/** deploy/edge/issue-cert.sh: HTTP-01 through the edge nginx, then copies the PEMs into {edgeDir}/certs/{hostname}. */
export const issueLetsEncryptCertificate: CertificateIssuer = (hostname, edgeDir) => {
  const script = join(repoRoot(), 'deploy', 'edge', 'issue-cert.sh')
  const email = (process.env.ACME_EMAIL || '').trim()
  const result = spawnSync('bash', [script, hostname, ...(email ? [email] : [])], {
    encoding: 'utf8',
    env: { ...process.env, EDGE_ROOT: edgeDir },
    timeout: 180_000,
    windowsHide: true,
  })
  const output = `${result.stderr || ''}\n${result.stdout || ''}`.trim()
  if (result.status !== 0 || result.error) {
    return { ok: false, message: (result.error?.message || output || 'Certificate issuance failed.').slice(-1500) }
  }
  return { ok: true, message: output.slice(-500) }
}

export function ensureHostnameCertificate(
  hostname: string,
  edgeDir: string,
  issuer: CertificateIssuer = issueLetsEncryptCertificate,
): CertificateResult {
  if (hostnameHasCertificate(hostname, edgeDir)) {
    return { status: 'present' }
  }
  const issued = issuer(hostname, edgeDir)
  if (!issued.ok || !hostnameHasCertificate(hostname, edgeDir)) {
    return { status: 'failed', message: issued.ok ? 'Issuer reported success but no certificate files were installed.' : issued.message }
  }
  return { status: 'issued' }
}
