#!/usr/bin/env node
/**
 * Repeatable Customer #1 smoke: health + public trial page + login page.
 * Usage: node martial_arts_template/scripts/customer1-smoke.mjs http://127.0.0.1:5000
 */
const base = (process.argv[2] || 'http://127.0.0.1:5000').replace(/\/$/, '')

async function get(path) {
  const response = await fetch(`${base}${path}`, { redirect: 'manual' })
  const text = await response.text()
  return { status: response.status, text, headers: response.headers }
}

const health = await get('/api/health')
if (health.status !== 200 || !health.text.includes('"ok":true')) {
  console.error('health failed', health.status, health.text.slice(0, 300))
  process.exit(1)
}
const login = await get('/login')
if (login.status >= 500) {
  console.error('login page failed', login.status)
  process.exit(1)
}
const trial = await get('/trial')
if (trial.status >= 500) {
  console.error('trial page failed', trial.status)
  process.exit(1)
}
console.info(`customer1-smoke ok ${base} health=${health.status} login=${login.status} trial=${trial.status}`)
console.info(health.text)
