import { chromium } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const base = process.env.MA_URL || 'http://localhost:5031'
const outDir = fileURLToPath(new URL('../public/product/', import.meta.url))

const shots = [
  { path: '/dashboard', file: 'dashboard.png' },
  { path: '/tasks', file: 'follow-up.png' },
  { path: '/leads/2', file: 'household.png' },
  { path: '/reports', file: 'reports.png' },
]

await mkdir(outDir, { recursive: true })
const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const login = await context.request.post(`${base}/api/auth/login`, {
  headers: {
    origin: base,
    referer: `${base}/login`,
  },
  data: {
    identifier: 'admin@local',
    password: process.env.MA_PASSWORD || '',
  },
})
if (!login.ok()) {
  throw new Error(`Login failed: ${login.status()} ${await login.text()}`)
}
const page = await context.newPage()
for (const shot of shots) {
  await page.goto(`${base}${shot.path}`)
  await page.waitForLoadState('networkidle')
  await page.addStyleTag({
    content: 'nuxt-devtools, #nuxt-devtools-container, .nuxt-devtools-icon, .nuxt-devtools-frame { display: none !important; }',
  })
  await page.screenshot({ path: `${outDir}/${shot.file}`, animations: 'disabled' })
}
await browser.close()
