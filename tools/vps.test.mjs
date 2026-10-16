import assert from 'node:assert/strict'
import { homedir } from 'node:os'
import { test } from 'node:test'
import { normalizeConfig, parseStatus, sshArgs, systemctlCommand } from './vps.mjs'

test('normalizeConfig fills defaults and expands ~', () => {
  const cfg = normalizeConfig({ host: 'h', identityFile: '~/.ssh/k' })
  assert.equal(cfg.user, 'root')
  assert.equal(cfg.port, 22)
  assert.equal(cfg.localPort, 52100)
  assert.ok(cfg.identityFile.startsWith(homedir()))
})

test('normalizeConfig requires host', () => {
  assert.throws(() => normalizeConfig({}), /host/)
})

test('sshArgs is non-interactive and pins the key', () => {
  const args = sshArgs(normalizeConfig({ host: 'h', user: 'u', identityFile: 'k' }))
  assert.ok(args.includes('BatchMode=yes'))
  assert.ok(args.includes('IdentitiesOnly=yes'))
  assert.equal(args.at(-1), 'u@h')
})

test('systemctlCommand only targets the Control Plane service', () => {
  assert.equal(systemctlCommand({ user: 'root' }, 'restart'), 'systemctl restart sic-control-plane')
  assert.equal(systemctlCommand({ user: 'ops' }, 'stop'), 'sudo -n systemctl stop sic-control-plane')
  assert.throws(() => systemctlCommand({ user: 'root' }, 'disable'))
})

test('parseStatus reports healthy only when active and HTTP 200', () => {
  assert.equal(parseStatus('active=active\nhttp=200\nhost=x').healthy, true)
  assert.equal(parseStatus('active=active\nhttp=000\n').healthy, false)
  assert.equal(parseStatus('active=inactive\nhttp=200\n').healthy, false)
})

test('parseStatus picks the matching timestamp and normalizes http', () => {
  const down = parseStatus('active=inactive\nupSince=A\ndownSince=B\nhttp=000000')
  assert.equal(down.since, 'B')
  assert.equal(down.http, '000')
  assert.equal(parseStatus('active=active\nupSince=A\ndownSince=B\nhttp=200').since, 'A')
})
