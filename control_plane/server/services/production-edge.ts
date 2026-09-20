import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { repoRoot } from './docker-relaunch'
import { edgeProxyMode, type HostingNodeKind } from './hosting-node'
import { assertPublicHostname } from '../../shared/utils/public-hostname'

export const CONTROL_PLANE_PORT = 52100
export const EDGE_NGINX_CONTAINER = 'sic-production-edge'

export type EdgeRoute = {
  hostname: string
  hostPort: number
  slug?: string
  productId?: string
}

export type EdgeGeneration = {
  nginxConf: string
  composeLinux: string
  composeDesktop: string
  routes: EdgeRoute[]
  proxyMode: 'host-network' | 'docker-desktop'
}

export function edgeRoot(root = repoRoot()) {
  return process.env.EDGE_ROOT?.trim() || join(root, 'deploy', 'edge')
}

export function edgeCertDir(hostname: string, root = edgeRoot()) {
  return join(root, 'certs', assertPublicHostname(hostname))
}

export function hostnameHasCertificate(hostname: string, root = edgeRoot()) {
  const dir = edgeCertDir(hostname, root)
  return existsSync(join(dir, 'fullchain.pem')) && existsSync(join(dir, 'privkey.pem'))
}

export function proxyUpstream(hostPort: number, mode: 'host-network' | 'docker-desktop') {
  if (!Number.isInteger(hostPort) || hostPort < 1) {
    throw new Error(`Edge host port ${hostPort} is invalid.`)
  }
  if (hostPort === CONTROL_PLANE_PORT) {
    throw new Error('Refusing to route public traffic to the Control Plane port.')
  }
  return mode === 'host-network'
    ? `http://127.0.0.1:${hostPort}`
    : `http://host.docker.internal:${hostPort}`
}

function escapeServerName(hostname: string) {
  return assertPublicHostname(hostname)
}

function vhostHttp(route: EdgeRoute, hasCert: boolean) {
  const redirect = hasCert
    ? `    location / {
      return 301 https://$host$request_uri;
    }`
    : `    location / {
      add_header Content-Type text/plain;
      return 503 "TLS certificate is not installed yet for this hostname.\\n";
    }`
  return `  server {
    listen 80;
    server_name ${escapeServerName(route.hostname)};

    location /.well-known/acme-challenge/ {
      root /var/www/acme;
    }

${redirect}
  }`
}

function vhostHttps(route: EdgeRoute, upstream: string) {
  const hostname = escapeServerName(route.hostname)
  return `  server {
    listen 443 ssl;
    http2 on;
    server_name ${hostname};

    ssl_certificate /etc/nginx/certs/${hostname}/fullchain.pem;
    ssl_certificate_key /etc/nginx/certs/${hostname}/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-Frame-Options DENY always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;

    location /.well-known/acme-challenge/ {
      root /var/www/acme;
    }

    location / {
      proxy_pass ${upstream};
      proxy_http_version 1.1;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Forwarded-Proto https;
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection $connection_upgrade;
    }
  }`
}

export function renderNginxConf(input: {
  routes: readonly EdgeRoute[]
  proxyMode?: 'host-network' | 'docker-desktop'
  hasCertificate?: (hostname: string) => boolean
}) {
  const mode = input.proxyMode || edgeProxyMode()
  const blocks = [
    `worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /tmp/nginx.pid;

events {
  worker_connections 1024;
}

http {
  include /etc/nginx/mime.types;
  default_type application/octet-stream;
  server_tokens off;
  client_max_body_size 25m;

  map $http_upgrade $connection_upgrade {
    default upgrade;
    '' close;
  }

  server {
    listen 80 default_server;
    server_name _;
    location /.well-known/acme-challenge/ {
      root /var/www/acme;
    }
    location / {
      return 444;
    }
  }`,
  ]

  for (const route of input.routes) {
    if (route.hostPort === CONTROL_PLANE_PORT) {
      throw new Error('Refusing to expose the Control Plane through the production edge.')
    }
    const hasCert = input.hasCertificate?.(route.hostname) ?? false
    const upstream = proxyUpstream(route.hostPort, mode)
    blocks.push(vhostHttp(route, hasCert))
    if (hasCert) {
      blocks.push(vhostHttps(route, upstream))
    }
  }

  blocks.push('}\n')
  const nginxConf = blocks.join('\n\n')
  if (nginxConf.includes(`:${CONTROL_PLANE_PORT}`) || nginxConf.includes(`127.0.0.1:${CONTROL_PLANE_PORT}`)) {
    throw new Error('Generated nginx must not mention the Control Plane port.')
  }
  return nginxConf
}

export function renderEdgeCompose(mode: 'host-network' | 'docker-desktop') {
  const common = `name: sic-production-edge

# Generated companion files live beside this compose file.
# Control Plane stays loopback-only and is never published here.

services:
  proxy:
    image: nginx:1.27-alpine
    container_name: ${EDGE_NGINX_CONTAINER}
    restart: unless-stopped
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certs:/etc/nginx/certs:ro
      - ./acme:/var/www/acme:ro`

  if (mode === 'host-network') {
    return `${common}
    network_mode: host
`
  }

  return `${common}
    ports:
      - "80:80"
      - "443:443"
    extra_hosts:
      - "host.docker.internal:host-gateway"
`
}

export function routesFromEnvironments(rows: readonly {
  type: string
  hostPort: number
  publicHostname?: string | null
  slug?: string
  lifecycleStatus?: string | null
  productInstance?: { productId?: string }
}[]): EdgeRoute[] {
  return rows
    .filter(row => row.type === 'PROD'
      && row.lifecycleStatus !== 'decommissioned'
      && row.lifecycleStatus !== 'archived'
      && Boolean(row.publicHostname)
      && row.hostPort !== CONTROL_PLANE_PORT)
    .map(row => ({
      hostname: assertPublicHostname(String(row.publicHostname)),
      hostPort: row.hostPort,
      slug: row.slug,
      productId: row.productInstance?.productId,
    }))
    .sort((left, right) => left.hostname.localeCompare(right.hostname))
}

export function generateProductionEdge(input: {
  routes: readonly EdgeRoute[]
  kind?: HostingNodeKind
  edgeDir?: string
  hasCertificate?: (hostname: string) => boolean
}): EdgeGeneration {
  const proxyMode = edgeProxyMode(input.kind)
  const edgeDir = input.edgeDir || edgeRoot()
  const hasCertificate = input.hasCertificate || ((hostname: string) => hostnameHasCertificate(hostname, edgeDir))
  return {
    nginxConf: renderNginxConf({ routes: input.routes, proxyMode, hasCertificate }),
    composeLinux: renderEdgeCompose('host-network'),
    composeDesktop: renderEdgeCompose('docker-desktop'),
    routes: [...input.routes],
    proxyMode,
  }
}

export function writeProductionEdge(input: {
  routes: readonly EdgeRoute[]
  kind?: HostingNodeKind
  edgeDir?: string
  hasCertificate?: (hostname: string) => boolean
}) {
  const edgeDir = input.edgeDir || edgeRoot()
  mkdirSync(join(edgeDir, 'certs'), { recursive: true })
  mkdirSync(join(edgeDir, 'acme'), { recursive: true })
  const generated = generateProductionEdge({ ...input, edgeDir })
  writeFileSync(join(edgeDir, 'nginx.conf'), generated.nginxConf, 'utf8')
  writeFileSync(join(edgeDir, 'docker-compose.yml'), generated.composeLinux, 'utf8')
  writeFileSync(join(edgeDir, 'docker-compose.desktop.yml'), generated.composeDesktop, 'utf8')
  return { ...generated, edgeDir }
}

export function listCertificateHostnames(root = edgeRoot()) {
  const certs = join(root, 'certs')
  if (!existsSync(certs)) {
    return [] as string[]
  }
  return readdirSync(certs, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && hostnameHasCertificate(entry.name, root))
    .map(entry => entry.name)
}

export function generateSelfSignedCertificate(hostname: string, root = edgeRoot()) {
  const host = assertPublicHostname(hostname)
  const dir = edgeCertDir(host, root)
  mkdirSync(dir, { recursive: true })
  const key = join(dir, 'privkey.pem')
  const cert = join(dir, 'fullchain.pem')
  const result = spawnSync('openssl', [
    'req', '-x509', '-nodes', '-newkey', 'rsa:2048', '-days', '30',
    '-keyout', key,
    '-out', cert,
    '-subj', `/CN=${host}`,
    '-addext', `subjectAltName=DNS:${host}`,
  ], { encoding: 'utf8' })
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || 'openssl failed to create a self-signed certificate.')
  }
  return { hostname: host, key, cert }
}

export function reloadProductionEdge(edgeDir = edgeRoot()) {
  const inspect = spawnSync('docker', ['inspect', '-f', '{{.State.Running}}', EDGE_NGINX_CONTAINER], { encoding: 'utf8' })
  if (inspect.status !== 0 || inspect.stdout.trim() !== 'true') {
    return { reloaded: false, reason: 'edge container is not running' as const }
  }
  const test = spawnSync('docker', ['exec', EDGE_NGINX_CONTAINER, 'nginx', '-t'], { encoding: 'utf8' })
  if (test.status !== 0) {
    throw new Error(test.stderr || test.stdout || 'nginx -t failed.')
  }
  const reload = spawnSync('docker', ['exec', EDGE_NGINX_CONTAINER, 'nginx', '-s', 'reload'], { encoding: 'utf8' })
  if (reload.status !== 0) {
    throw new Error(reload.stderr || reload.stdout || 'nginx reload failed.')
  }
  void edgeDir
  return { reloaded: true as const }
}

export function readGeneratedNginx(root = edgeRoot()) {
  const path = join(root, 'nginx.conf')
  return existsSync(path) ? readFileSync(path, 'utf8') : ''
}
