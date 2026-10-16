import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { afterEach, describe, expect, it } from 'vitest'
import { createDb } from '../../server/database'
import { migrateDatabase } from '../../server/database/migrate'
import { seedRegistry } from '../../server/database/seed'
import { addProductInstance, createCustomerAccount } from '../../server/services/provision-registry'
import { assignPublicHostname, autoAssignPublicHostname, defaultPublicHostname } from '../../server/services/public-hostname'
import { autoCertificateEnabled, type CertificateIssuer, ensureHostnameCertificate } from '../../server/services/edge-certificate'
import { listRegisteredEnvironments } from '../../server/services/registry'

const roots: string[] = []

afterEach(() => {
  delete process.env.HOSTING_NODE_NAME
  delete process.env.HOSTING_NODE_KIND
  delete process.env.EDGE_ROOT
  for (const root of roots.splice(0)) {
    try {
      rmSync(root, { recursive: true, force: true })
    } catch {
      // Windows can hold the sqlite file briefly.
    }
  }
})

function tmpRoot() {
  const root = mkdtempSync(join(tmpdir(), `auto-hostname-${randomUUID()}-`))
  roots.push(root)
  return root
}

/** Stands in for issue-cert.sh: installs PEM files where the edge looks for them. */
const fakeIssuer: CertificateIssuer = (hostname, edgeDir) => {
  const dir = join(edgeDir, 'certs', hostname)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'fullchain.pem'), 'cert')
  writeFileSync(join(dir, 'privkey.pem'), 'key')
  return { ok: true, message: 'issued' }
}

const failingIssuer: CertificateIssuer = () => ({ ok: false, message: 'DNS problem: NXDOMAIN' })

async function vpsRegistry() {
  process.env.HOSTING_NODE_NAME = 'vps-1'
  process.env.HOSTING_NODE_KIND = 'vps'
  const root = tmpRoot()
  const edgeDir = join(root, 'edge')
  process.env.EDGE_ROOT = edgeDir
  mkdirSync(edgeDir, { recursive: true })
  const url = `file:${join(root, 'control-plane.sqlite').replaceAll('\\', '/')}`
  await migrateDatabase(url)
  await seedRegistry(url)
  const { client, db } = createDb(url)
  const account = await createCustomerAccount(db, { displayName: 'Nova BJJ', slug: 'nova-bjj', adminEmail: 'admin@nova.local', filesRoot: root })
  return { root, edgeDir, client, db, customerId: account.customerId }
}

describe('default public hostname', () => {
  it('uses the customer slug, then customer-product, under the base domain', () => {
    expect(defaultPublicHostname({ customerSlug: 'top-tier-hauling', productId: 'sales', baseDomain: 'nuxxion.com', taken: new Set() }))
      .toBe('top-tier-hauling.nuxxion.com')
    expect(defaultPublicHostname({ customerSlug: 'acme', productId: 'sales', baseDomain: '.Nuxxion.com.', taken: new Set(['acme.nuxxion.com']) }))
      .toBe('acme-sales.nuxxion.com')
    expect(defaultPublicHostname({ customerSlug: 'acme', productId: 'sales', baseDomain: 'nuxxion.com', taken: new Set(['acme.nuxxion.com', 'acme-sales.nuxxion.com']) }))
      .toBeNull()
    expect(defaultPublicHostname({ customerSlug: 'acme', productId: 'sales', baseDomain: '', taken: new Set() })).toBeNull()
  })

  it('reads EDGE_AUTO_CERT as an explicit opt-in', () => {
    expect(autoCertificateEnabled({})).toBe(false)
    expect(autoCertificateEnabled({ EDGE_AUTO_CERT: 'true' })).toBe(true)
    expect(autoCertificateEnabled({ EDGE_AUTO_CERT: '0' })).toBe(false)
  })
})

describe('edge certificate', () => {
  it('skips an installed certificate and reports a failed issue', () => {
    const edgeDir = join(tmpRoot(), 'edge')
    expect(ensureHostnameCertificate('a.example.com', edgeDir, failingIssuer)).toEqual({ status: 'failed', message: 'DNS problem: NXDOMAIN' })
    expect(ensureHostnameCertificate('a.example.com', edgeDir, fakeIssuer)).toEqual({ status: 'issued' })
    expect(ensureHostnameCertificate('a.example.com', edgeDir, failingIssuer)).toEqual({ status: 'present' })
  })

  it('turns on HTTPS in nginx once the hostname certificate is issued', async () => {
    const { root, edgeDir, client, db, customerId } = await vpsRegistry()
    try {
      const added = await addProductInstance(db, customerId, { productId: 'sales', filesRoot: root })
      const prodId = added.environments.find(env => env.type === 'PROD')!.id
      const failed = await assignPublicHostname(db, prodId, 'nova.example.com', { filesRoot: root, edgeDir, relaunch: false, certificate: true, issuer: failingIssuer })
      expect(failed.certificate.status).toBe('failed')
      expect(readFileSync(join(edgeDir, 'nginx.conf'), 'utf8')).toContain('TLS certificate is not installed yet')
      const issued = await assignPublicHostname(db, prodId, 'nova.example.com', { filesRoot: root, edgeDir, relaunch: false, certificate: true, issuer: fakeIssuer })
      expect(issued.certificate.status).toBe('issued')
      const nginx = readFileSync(join(edgeDir, 'nginx.conf'), 'utf8')
      expect(nginx).toContain('listen 443 ssl')
      expect(nginx).toContain('return 301 https://$host$request_uri')
      const skipped = await assignPublicHostname(db, prodId, 'nova.example.com', { filesRoot: root, edgeDir, relaunch: false, certificate: false })
      expect(skipped.certificate.status).toBe('skipped')
    } finally {
      client.close()
    }
  })
})

describe('provisioning hostname', () => {
  it('gives each new PROD its default hostname and leaves DEV on loopback', async () => {
    const { root, edgeDir, client, db, customerId } = await vpsRegistry()
    try {
      await addProductInstance(db, customerId, { productId: 'martial-arts', filesRoot: root })
      await addProductInstance(db, customerId, { productId: 'sales', filesRoot: root })
      const rows = (await listRegisteredEnvironments(db)).filter(row => row.customer.slug === 'nova-bjj')
      const options = { filesRoot: root, edgeDir, baseDomain: 'nuxxion.com', certificate: true, issuer: fakeIssuer }
      const dev = rows.find(row => row.type === 'DEV')!
      expect(await autoAssignPublicHostname(db, dev, options)).toBeNull()
      const maProd = rows.find(row => row.type === 'PROD' && row.productInstance.productId === 'martial-arts')!
      const salesProd = rows.find(row => row.type === 'PROD' && row.productInstance.productId === 'sales')!
      const first = await autoAssignPublicHostname(db, maProd, options)
      expect(first && 'certificate' in first ? [first.hostname, first.certificate.status] : first).toEqual(['nova-bjj.nuxxion.com', 'issued'])
      const second = await autoAssignPublicHostname(db, salesProd, options)
      expect(second?.hostname).toBe('nova-bjj-sales.nuxxion.com')
      const envFile = readFileSync(join(root, salesProd.envFileLocal), 'utf8')
      expect(envFile).toContain('NUXT_PUBLIC_ORIGIN="https://nova-bjj-sales.nuxxion.com"')
      expect(existsSync(join(edgeDir, 'certs', 'nova-bjj-sales.nuxxion.com', 'privkey.pem'))).toBe(true)
      const assignedAgain = (await listRegisteredEnvironments(db)).find(row => row.id === maProd.id)!
      expect(await autoAssignPublicHostname(db, assignedAgain, options)).toBeNull()
      expect(await autoAssignPublicHostname(db, salesProd, { ...options, baseDomain: null })).toBeNull()
    } finally {
      client.close()
    }
  })
})
