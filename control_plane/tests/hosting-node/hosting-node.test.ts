import { mkdirSync, mkdtempSync, readFileSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { randomUUID } from 'node:crypto'
import {
  CONTROL_PLANE_PORT,
  proxyUpstream,
  renderNginxConf,
  routesFromEnvironments,
  writeProductionEdge,
} from '../../server/services/production-edge'
import { assertPublicHostname, publicOriginForHostname } from '../../shared/utils/public-hostname'
import { localHostingNodeSpec } from '../../server/services/hosting-node'
import { patchEnvFileContents, publicEnvSettings, renderProvisionedEnv } from '../../server/services/provision-env'
import { createDb } from '../../server/database'
import { migrateDatabase } from '../../server/database/migrate'
import { seedRegistry } from '../../server/database/seed'
import { addProductInstance, createCustomerAccount } from '../../server/services/provision-registry'
import { assignPublicHostname } from '../../server/services/public-hostname'
import { listRegisteredEnvironments } from '../../server/services/registry'
import { snapshotControlPlaneRegistry } from '../../server/services/control-plane-backup'

const roots: string[] = []

afterEach(() => {
  delete process.env.HOSTING_NODE_NAME
  delete process.env.HOSTING_NODE_KIND
  delete process.env.EDGE_ROOT
  delete process.env.EDGE_PROXY_MODE
  delete process.env.SKIP_LAB_SEED
  for (const root of roots.splice(0)) {
    try {
      rmSync(root, { recursive: true, force: true })
    } catch {
      // ignore
    }
  }
})

function tmpRoot() {
  const root = mkdtempSync(join(tmpdir(), `hosting-node-${randomUUID()}-`))
  roots.push(root)
  return root
}

describe('public hostname', () => {
  it('rejects localhost and derives https origin', () => {
    expect(() => assertPublicHostname('localhost')).toThrow(/real DNS/)
    expect(assertPublicHostname('ma-test.strategicinsightsconsulting.net')).toBe('ma-test.strategicinsightsconsulting.net')
    expect(publicOriginForHostname('Academy.Future-Product-Domain.com.')).toBe('https://academy.future-product-domain.com')
  })

  it('patches NUXT_PUBLIC_ORIGIN without rewriting secrets', () => {
    const rendered = renderProvisionedEnv({
      composeProject: 'nova-bjj-prod',
      containerName: 'nova-bjj-prod-app',
      hostPort: 52210,
      sqliteVolume: 'nova-bjj-prod-sqlite',
      assetsVolume: 'nova-bjj-prod-assets',
      expectedImage: 'martial-arts-acquisition:s4',
      type: 'PROD',
      displayName: 'Nova BJJ',
      adminEmail: 'admin@nova.local',
      timezone: 'America/Denver',
      sessionPassword: 'test-session-password-32-characters',
      authPassword: 'UniquePass1!',
    })
    expect(rendered.contents).toMatch(/HOST_BIND="0.0.0.0"/)
    expect(rendered.contents).toMatch(/NUXT_PUBLIC_ORIGIN=""/)
    const patched = patchEnvFileContents(rendered.contents, {
      NUXT_PUBLIC_ORIGIN: 'https://ma-test.example.com',
      HOST_BIND: '127.0.0.1',
      SESSION_COOKIE_SECURE: 'true',
      TRUSTED_PROXY_IPS: '127.0.0.1',
    })
    expect(patched).toMatch(/NUXT_PUBLIC_ORIGIN="https:\/\/ma-test.example.com"/)
    expect(patched).toMatch(/HOST_BIND="127.0.0.1"/)
    expect(patched).toMatch(/NUXT_AUTH_PASSWORD="UniquePass1!"/)
    expect(publicEnvSettings({ publicHostname: 'ma-test.example.com' }).sessionCookieSecure).toBe('true')
  })
})

describe('production edge generator', () => {
  it('routes two product hostnames and never mentions the Control Plane', () => {
    const conf = renderNginxConf({
      proxyMode: 'host-network',
      hasCertificate: hostname => hostname === 'academy-a.example.com',
      routes: [
        { hostname: 'academy-a.example.com', hostPort: 52200, productId: 'martial-arts' },
        { hostname: 'sales-a.example.com', hostPort: 52220, productId: 'sales' },
      ],
    })
    expect(conf).toContain('server_name academy-a.example.com')
    expect(conf).toContain('server_name sales-a.example.com')
    expect(conf).toContain('proxy_pass http://127.0.0.1:52200')
    expect(conf).toContain('location /.well-known/acme-challenge/')
    expect(conf).toContain('ssl_certificate /etc/nginx/certs/academy-a.example.com/fullchain.pem')
    expect(conf).not.toContain('sales-a.example.com/fullchain.pem')
    expect(conf).not.toContain(String(CONTROL_PLANE_PORT))
    expect(conf).not.toContain('control-plane')
    expect(() => proxyUpstream(CONTROL_PLANE_PORT, 'host-network')).toThrow(/Control Plane/)
    expect(proxyUpstream(52200, 'docker-desktop')).toBe('http://host.docker.internal:52200')
  })

  it('omits decommissioned routes', () => {
    const routes = routesFromEnvironments([
      { type: 'PROD', hostPort: 52200, publicHostname: 'keep.example.com', lifecycleStatus: 'ready' },
      { type: 'PROD', hostPort: 52210, publicHostname: 'gone.example.com', lifecycleStatus: 'decommissioned' },
      { type: 'DEV', hostPort: 52201, publicHostname: 'dev.example.com', lifecycleStatus: 'ready' },
    ])
    expect(routes.map(route => route.hostname)).toEqual(['keep.example.com'])
  })

  it('writes linux and desktop compose files without publishing 52100', () => {
    const edgeDir = join(tmpRoot(), 'edge')
    const generated = writeProductionEdge({
      edgeDir,
      kind: 'vps',
      routes: [{ hostname: 'ma-test.example.com', hostPort: 52200 }],
    })
    expect(generated.composeLinux).toContain('network_mode: host')
    expect(generated.composeDesktop).toContain('host.docker.internal')
    expect(generated.composeLinux).not.toContain('52100')
    expect(readFileSync(join(edgeDir, 'nginx.conf'), 'utf8')).toContain('ma-test.example.com')
  })
})

describe('hosting node identity', () => {
  it('defaults to laptop and can be a vps local-docker node', () => {
    expect(localHostingNodeSpec()).toEqual({ name: 'laptop', kind: 'laptop', driver: 'local-docker' })
    process.env.HOSTING_NODE_NAME = 'vps-1'
    process.env.HOSTING_NODE_KIND = 'vps'
    expect(localHostingNodeSpec()).toEqual({ name: 'vps-1', kind: 'vps', driver: 'local-docker' })
  })

  it('attaches new environments to the local vps node and can assign a portable hostname', async () => {
    process.env.HOSTING_NODE_NAME = 'vps-1'
    process.env.HOSTING_NODE_KIND = 'vps'
    const root = tmpRoot()
    process.env.EDGE_ROOT = join(root, 'edge')
    mkdirSync(process.env.EDGE_ROOT, { recursive: true })
    const url = `file:${join(root, 'control-plane.sqlite').replaceAll('\\', '/')}`
    await migrateDatabase(url)
    await seedRegistry(url)
    const { client, db } = createDb(url)
    try {
      const account = await createCustomerAccount(db, {
        displayName: 'Nova BJJ',
        slug: 'nova-bjj',
        adminEmail: 'admin@nova.local',
        filesRoot: root,
      })
      const added = await addProductInstance(db, account.customerId, {
        productId: 'martial-arts',
        filesRoot: root,
      })
      const rows = (await listRegisteredEnvironments(db)).filter(row => row.customer.slug === 'nova-bjj')
      expect(rows.every(row => row.node.name === 'vps-1')).toBe(true)
      expect(rows.every(row => row.node.kind === 'vps')).toBe(true)
      expect(new Set(rows.map(row => row.sqliteVolume)).size).toBe(2)
      const prod = rows.find(row => row.type === 'PROD')
      expect(prod).toBeTruthy()
      const assigned = await assignPublicHostname(db, prod!.id, 'ma-test.strategicinsightsconsulting.net', {
        filesRoot: root,
        edgeDir: process.env.EDGE_ROOT,
        relaunch: false,
      })
      expect(assigned.publicOrigin).toBe('https://ma-test.strategicinsightsconsulting.net')
      const envFile = readFileSync(join(root, prod!.envFileLocal), 'utf8')
      expect(envFile).toContain('NUXT_PUBLIC_ORIGIN="https://ma-test.strategicinsightsconsulting.net"')
      expect(envFile).toContain('HOST_BIND="127.0.0.1"')
      const moved = await assignPublicHostname(db, prod!.id, 'academy.future-product-domain.com', {
        filesRoot: root,
        edgeDir: process.env.EDGE_ROOT,
        relaunch: false,
      })
      expect(moved.publicOrigin).toBe('https://academy.future-product-domain.com')
      const nginx = readFileSync(join(process.env.EDGE_ROOT, 'nginx.conf'), 'utf8')
      expect(nginx).toContain('academy.future-product-domain.com')
      expect(nginx).not.toContain('ma-test.strategicinsightsconsulting.net')
      expect(nginx).not.toContain('52100')
      const sales = await addProductInstance(db, account.customerId, {
        productId: 'sales',
        filesRoot: root,
      })
      const salesProd = (await listRegisteredEnvironments(db)).find(row => row.id === sales.environments.find(env => env.type === 'PROD')?.id)
      expect(salesProd?.sqliteVolume).not.toBe(prod!.sqliteVolume)
      expect(salesProd?.assetsVolume).not.toBe(prod!.assetsVolume)
      const salesAssigned = await assignPublicHostname(db, salesProd!.id, 'sales-a.example.com', {
        filesRoot: root,
        edgeDir: process.env.EDGE_ROOT,
        relaunch: false,
      })
      expect(salesAssigned.publicOrigin).toBe('https://sales-a.example.com')
      const nginxBoth = readFileSync(join(process.env.EDGE_ROOT, 'nginx.conf'), 'utf8')
      expect(nginxBoth).toContain('sales-a.example.com')
      expect(nginxBoth).toContain('academy.future-product-domain.com')
      void added
    } finally {
      client.close()
    }
  })

  it('snapshots the Control Plane registry without touching customer volumes', async () => {
    const root = tmpRoot()
    const url = `file:${join(root, 'control-plane.sqlite').replaceAll('\\', '/')}`
    await migrateDatabase(url)
    await seedRegistry(url)
    const { client } = createDb(url)
    try {
      const backup = await snapshotControlPlaneRegistry(client, { databaseUrl: url, filesRoot: root })
      expect(existsSync(backup.path)).toBe(true)
      expect(backup.path).toContain('control-plane')
    } finally {
      client.close()
    }
  })
})
