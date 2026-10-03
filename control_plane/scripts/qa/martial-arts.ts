import { chromium } from '@playwright/test'
import { eq, sql } from 'drizzle-orm'
import { createDb, getDatabaseUrl } from '../../server/database'
import { migrateDatabase } from '../../server/database/migrate'
import { qaFindings } from '../../server/database/schema'
import { composeRootForEnvironment } from '../../server/services/docker-relaunch'
import { readQaCredentialsFromEnvironmentFile, selectQaEnvironment } from '../../server/services/qa-runner-config'
import { listRegisteredEnvironments } from '../../server/services/registry'
import {
  assertSafeQaEnvironment,
  completeQaRun,
  createQaFinding,
  createQaRun,
  recordQaWorkflow,
  storeQaEvidence,
  type QaFindingInput,
} from '../../server/services/qa'

type TechnicalEvent = { kind: 'console' | 'pageerror' | 'network', message: string, url: string, status?: number }
const ANSI_ESCAPE = new RegExp(`${String.fromCharCode(27)}\\[[0-?]*[ -/]*[@-~]`, 'g')

function argument(name: string) {
  const exact = process.argv.find(item => item.startsWith(`--${name}=`))
  if (exact) return exact.slice(name.length + 3)
  const index = process.argv.indexOf(`--${name}`)
  return index >= 0 ? process.argv[index + 1] : undefined
}

function hasFlag(name: string) {
  return process.argv.includes(`--${name}`)
}

function relevantUrl(url: string) {
  return !url.includes('/_nuxt/') && !url.endsWith('/favicon.ico') && !url.startsWith('data:')
}

function safeMessage(value: unknown, secrets: string[] = []) {
  let text = (value instanceof Error ? value.message : String(value)).replace(ANSI_ESCAPE, '')
  for (const secret of [...secrets, process.env.QA_PASSWORD, process.env.QA_NEW_PASSWORD]) {
    if (secret) text = text.replaceAll(secret, '[redacted]')
  }
  return text
}

async function main() {
  const environmentSelector = argument('environment') || argument('environment-id')
  await migrateDatabase()
  const { client, db } = createDb(getDatabaseUrl())
  let run: Awaited<ReturnType<typeof createQaRun>> | null = null
  let secrets: string[] = []
  try {
    const environments = await listRegisteredEnvironments(db)
    if (hasFlag('list-environments')) {
      for (const environment of environments.filter(item => item.productInstance.productId === 'martial-arts')) {
        console.log(`${environment.slug}\t${environment.type}\t${environment.lifecycleStatus}\t${environment.accessUrl}`)
      }
      return
    }
    if (!environmentSelector) throw new Error('Usage: pnpm qa:martial-arts -- --environment <registered-non-prod-slug-or-id> [--use-environment-credentials] [--allow-test-data] [--headed]')
    const environment = selectQaEnvironment(environments, environmentSelector)
    assertSafeQaEnvironment(environment)
    const suppliedUsername = process.env.QA_USERNAME?.trim()
    const suppliedPassword = process.env.QA_PASSWORD?.trim()
    const credentials = hasFlag('use-environment-credentials')
      ? readQaCredentialsFromEnvironmentFile(environment, composeRootForEnvironment(environment))
      : { username: suppliedUsername, password: suppliedPassword }
    if (!credentials.username || !credentials.password) {
      throw new Error('QA_USERNAME and QA_PASSWORD are required and are never persisted, or pass --use-environment-credentials to read the registered gitignored local environment file.')
    }
    const username = credentials.username
    const password = credentials.password
    secrets = [username, password]
    const healthResponse = await fetch(`${environment.accessUrl.replace(/\/$/, '')}/api/health`)
    if (!healthResponse.ok) throw new Error(`Target health check failed with HTTP ${healthResponse.status}.`)
    const health = await healthResponse.json() as { releaseId?: string, schemaVersion?: string }
    run = await createQaRun(db, {
      productId: 'martial-arts',
      productInstanceId: environment.productInstance.id,
      environmentId: environment.id,
      environmentType: environment.type,
      baseUrl: environment.accessUrl,
      buildVersion: health.releaseId || environment.expectedImage,
      trigger: 'manual-cli',
      browser: 'chromium',
      viewport: '1440x900 + 390x844',
    })
    const browser = await chromium.launch({ headless: !hasFlag('headed') })
    const context = await browser.newContext({ baseURL: environment.accessUrl, viewport: { width: 1440, height: 900 } })
    const page = await context.newPage()
    const technical: TechnicalEvent[] = []
    page.on('console', (message) => {
      if (message.type() === 'error') technical.push({ kind: 'console', message: safeMessage(message.text(), secrets), url: page.url() })
    })
    page.on('pageerror', error => technical.push({ kind: 'pageerror', message: safeMessage(error, secrets), url: page.url() }))
    page.on('response', (response) => {
      if (response.status() >= 400 && relevantUrl(response.url())) technical.push({ kind: 'network', message: `HTTP ${response.status()} ${response.request().method()}`, url: response.url(), status: response.status() })
    })
    page.on('requestfailed', (request) => {
      const reason = request.failure()?.errorText || 'request failed'
      if (relevantUrl(request.url()) && !reason.includes('ERR_ABORTED')) technical.push({ kind: 'network', message: safeMessage(reason, secrets), url: request.url() })
    })

    const findingSignatures = new Set<string>()
    const evidenceSignatures = new Set<string>()
    async function finding(input: QaFindingInput) {
      const signature = `${input.category}|${input.route}|${input.title}|${input.observation}`
      if (findingSignatures.has(signature)) return
      findingSignatures.add(signature)
      const row = await createQaFinding(db, run!, input)
      try {
        const viewport = page.viewportSize()
        const bytes = await page.screenshot({ fullPage: true })
        await storeQaEvidence(db, { qaRunId: run!.id, findingId: row.id, kind: 'SCREENSHOT', fileName: `${input.workflow || 'finding'}-${row.id}.png`, mimeType: 'image/png', bytes, route: input.route, metadata: { viewport, url: page.url() } })
        evidenceSignatures.add(`${new URL(page.url()).pathname}|${viewport?.width}x${viewport?.height}`)
      } catch {
        // A finding remains actionable even if the browser could not capture a screenshot.
      }
    }

    async function captureWorkflowEvidence(workflow: string) {
      const route = new URL(page.url()).pathname
      const viewport = page.viewportSize()
      const signature = `${route}|${viewport?.width}x${viewport?.height}`
      if (evidenceSignatures.has(signature)) return
      evidenceSignatures.add(signature)
      const bytes = await page.screenshot({ fullPage: true })
      await storeQaEvidence(db, {
        qaRunId: run!.id,
        kind: 'SCREENSHOT',
        fileName: `${workflow.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${viewport?.width || 'unknown'}x${viewport?.height || 'unknown'}.png`,
        mimeType: 'image/png',
        bytes,
        route,
        metadata: { workflow, viewport, url: page.url() },
      })
    }

    async function deterministicReview(workflow: string) {
      const route = new URL(page.url()).pathname
      // Script text avoids build-tool helper injection into Playwright's browser realm.
      const checks = await page.evaluate<{
        h1Count: number
        unlabeled: string[]
        unnamedActions: number
        horizontalOverflow: number
      }>(`(() => {
        const visible = (element) => {
          const style = window.getComputedStyle(element)
          const rect = element.getBoundingClientRect()
          return style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 0 && rect.height > 0
        }
        const controls = Array.from(document.querySelectorAll('input:not([type="hidden"]), select, textarea')).filter(visible)
        const unlabeled = controls.filter((control) => {
          const id = control.getAttribute('id')
          return !control.getAttribute('aria-label') && !control.getAttribute('aria-labelledby') && !control.closest('label') && !(id && document.querySelector('label[for="' + CSS.escape(id) + '"]'))
        }).map(control => control.tagName.toLowerCase() + (control.getAttribute('name') ? '[name=' + control.getAttribute('name') + ']' : ''))
        const unnamedActions = Array.from(document.querySelectorAll('button, a[href]')).filter(visible).filter(element => !(element.getAttribute('aria-label') || element.getAttribute('aria-labelledby') || element.textContent?.trim() || element.querySelector('img[alt]'))).length
        return {
          h1Count: document.querySelectorAll('h1').length,
          unlabeled,
          unnamedActions,
          horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        }
      })()`)
      if (checks.h1Count !== 1) await finding({ route, workflow, category: 'ACCESSIBILITY', severity: 'MEDIUM', title: 'Page heading structure is unclear', observation: `The page contains ${checks.h1Count} level-one headings.`, expectedBehavior: 'Each page should expose one clear level-one heading.', suggestedRemediation: 'Add one descriptive h1 or correct duplicate heading levels.', detectionMethod: 'DETERMINISTIC_DOM', confidence: 'HIGH', rationale: 'The DOM heading count is directly measurable.', reproductionSteps: [`Open ${route}`, 'Inspect h1 elements.'] })
      if (checks.unlabeled.length) await finding({ route, workflow, category: 'ACCESSIBILITY', severity: 'HIGH', title: 'Visible form controls lack accessible labels', observation: `${checks.unlabeled.length} visible control(s) have no associated or ARIA label: ${checks.unlabeled.slice(0, 8).join(', ')}.`, expectedBehavior: 'Every interactive form control has a programmatic accessible name.', suggestedRemediation: 'Associate each control with a label or an appropriate ARIA name.', detectionMethod: 'DETERMINISTIC_DOM', confidence: 'HIGH', rationale: 'The check tests standard label association mechanisms.', reproductionSteps: [`Open ${route}`, 'Inspect visible form controls and their accessible names.'] })
      if (checks.unnamedActions) await finding({ route, workflow, category: 'ACCESSIBILITY', severity: 'HIGH', title: 'Visible actions lack accessible names', observation: `${checks.unnamedActions} visible button or link has no text, image alt, or ARIA name.`, expectedBehavior: 'Every actionable control exposes a meaningful accessible name.', suggestedRemediation: 'Add visible text or a concise aria-label.', detectionMethod: 'DETERMINISTIC_DOM', confidence: 'HIGH', rationale: 'The action has no detectable accessible-name source.', reproductionSteps: [`Open ${route}`, 'Inspect visible links and buttons.'] })
      if (checks.horizontalOverflow > 2) await finding({ route, workflow, category: 'UI', severity: 'MEDIUM', title: 'Page overflows the viewport horizontally', observation: `Document content is ${checks.horizontalOverflow}px wider than the viewport.`, expectedBehavior: 'Primary content should fit the selected viewport without unintended horizontal page scrolling.', suggestedRemediation: 'Constrain wide content or place only intentional tabular overflow in a scroll container.', detectionMethod: 'LAYOUT_MEASUREMENT', confidence: 'HIGH', rationale: 'Viewport and document widths are directly measured.', reproductionSteps: [`Open ${route} at ${page.viewportSize()?.width}px wide`, 'Compare document scroll width with client width.'] })
    }

    async function workflow(name: string, action: () => Promise<void>) {
      const startedAt = new Date().toISOString()
      const startEvent = technical.length
      const routes: string[] = []
      try {
        await action()
        routes.push(new URL(page.url()).pathname)
        await deterministicReview(name)
        await captureWorkflowEvidence(name)
        const newEvents = technical.slice(startEvent)
        for (const event of newEvents) await finding({ route: new URL(event.url, environment.accessUrl).pathname, workflow: name, category: 'BUG', severity: event.status && event.status >= 500 ? 'HIGH' : 'MEDIUM', title: event.kind === 'network' ? 'Browser request failed' : 'Browser runtime error', observation: `${event.message} at ${event.url}`, expectedBehavior: 'The exercised workflow should complete without unexpected browser or HTTP errors.', suggestedRemediation: 'Inspect the associated route, server logs, and request context; handle or remove the failing operation.', detectionMethod: event.kind.toUpperCase(), confidence: 'HIGH', rationale: 'Captured directly from the browser during this workflow.', reproductionSteps: [`Run the ${name} workflow`, `Visit ${new URL(event.url, environment.accessUrl).pathname}`], consoleContext: event.kind !== 'network' ? event : undefined, networkContext: event.kind === 'network' ? event : undefined })
        await recordQaWorkflow(db, { qaRunId: run!.id, name, status: 'PASSED', startedAt, completedAt: new Date().toISOString(), routes })
      } catch (error) {
        const message = safeMessage(error, secrets)
        routes.push(new URL(page.url()).pathname)
        await finding({ route: routes[0], workflow: name, category: 'BUG', severity: 'HIGH', title: `Workflow failed: ${name}`, observation: message, expectedBehavior: `The ${name} workflow should complete.`, suggestedRemediation: 'Reproduce with the recorded steps and inspect the screenshot and browser diagnostics.', detectionMethod: 'PLAYWRIGHT_ASSERTION', confidence: 'HIGH', rationale: 'The automated workflow could not reach its required end state.', reproductionSteps: [`Run the ${name} workflow against ${environment.slug}.`] })
        await recordQaWorkflow(db, { qaRunId: run!.id, name, status: 'FAILED', startedAt, completedAt: new Date().toISOString(), errorSummary: message, routes })
      }
    }

    await workflow('authentication', async () => {
      await page.goto('/login', { waitUntil: 'networkidle' })
      await page.getByLabel('Username or email').fill(username)
      await page.getByLabel('Password').fill(password)
      await page.getByRole('button', { name: 'Sign in' }).click()
      await page.waitForURL(url => !url.pathname.startsWith('/login'), { timeout: 15_000 })
      if (new URL(page.url()).pathname === '/account/password') throw new Error('QA account requires a password change. Prepare a dedicated non-expiring QA credential; the runner will not rotate secrets autonomously.')
    })
    for (const item of [{ name: 'dashboard', route: '/dashboard' }, { name: 'lead list', route: '/leads' }, { name: 'follow-up queue', route: '/tasks' }, { name: 'marketing hub', route: '/marketing' }, { name: 'settings', route: '/settings' }]) {
      await workflow(item.name, async () => {
        const response = await page.goto(item.route, { waitUntil: 'networkidle' })
        if (!response?.ok()) throw new Error(`${item.route} returned HTTP ${response?.status() || 'unknown'}.`)
      })
    }
    if (hasFlag('allow-test-data')) {
      await workflow('create disposable lead', async () => {
        const stamp = Date.now()
        await page.goto('/leads/new', { waitUntil: 'networkidle' })
        await page.getByLabel('First name').fill('QA')
        await page.getByLabel('Last name').fill(`Automation ${stamp}`)
        await page.getByLabel('Email', { exact: true }).fill(`qa+${stamp}@example.invalid`)
        await page.getByRole('button', { name: 'Create household' }).click()
        await page.waitForURL(url => /^\/leads\/(?!new$)[^/]+$/.test(url.pathname), { timeout: 15_000 })
        await page.getByLabel('Select household').waitFor({ state: 'visible', timeout: 15_000 })
      })
    }
    await workflow('mobile dashboard', async () => {
      await page.setViewportSize({ width: 390, height: 844 })
      const response = await page.goto('/dashboard', { waitUntil: 'networkidle' })
      if (!response?.ok()) throw new Error(`Mobile dashboard returned HTTP ${response?.status() || 'unknown'}.`)
    })
    await browser.close()
    const [findingCount] = await db.select({ count: sql<number>`count(*)` }).from(qaFindings).where(eq(qaFindings.qaRunId, run.id))
    await completeQaRun(db, run.id, { status: Number(findingCount?.count || 0) > 0 ? 'COMPLETED_WITH_FINDINGS' : 'COMPLETED' })
    console.log(`QA run ${run.id} completed with ${findingCount?.count || 0} finding(s).`)
    console.log(`Review it in Control Plane /qa/runs/${run.id}.`)
  } catch (error) {
    if (run) await completeQaRun(db, run.id, { status: 'FAILED', errorSummary: safeMessage(error, secrets) })
    throw error
  } finally {
    client.close()
  }
}

main().catch((error) => {
  console.error(safeMessage(error))
  process.exitCode = 1
})
