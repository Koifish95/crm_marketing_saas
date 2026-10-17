import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const appVue = readFileSync(join(process.cwd(), 'app/app.vue'), 'utf8')
const css = readFileSync(join(process.cwd(), 'app/assets/css/main.css'), 'utf8')
const nuxtConfig = readFileSync(join(process.cwd(), 'nuxt.config.ts'), 'utf8')

describe('data-app-env on <html>', () => {
  it('app.vue sets data-app-env on html from runtimeConfig public appEnv', () => {
    expect(appVue).toMatch(/useRuntimeConfig\(\)/)
    expect(appVue).toMatch(/config\.public\.appEnv/)
    expect(appVue).toMatch(/htmlAttrs:\s*\{[^}]*'data-app-env':\s*appEnv/s)
    expect(appVue).toMatch(/<NuxtLayout>[\s\S]*<NuxtPage\s*\/>/)
  })

  it('runtime config provides appEnv, defaulting to dev', () => {
    expect(nuxtConfig).toMatch(/appEnv:\s*process\.env\.NUXT_PUBLIC_APP_ENV \|\| process\.env\.APP_ENV \|\| 'dev'/)
  })

  it('main.css remaps DEV and STAGE and leaves PRODUCTION on the default navy', () => {
    expect(css).toMatch(/html\[data-app-env="dev"\]/)
    expect(css).toMatch(/html\[data-app-env="stage"\]/)
    expect(css).not.toMatch(/data-app-env="production"/)
  })
})
