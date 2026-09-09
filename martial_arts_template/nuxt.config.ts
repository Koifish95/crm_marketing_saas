import tailwindcss from '@tailwindcss/vite'
import { isForbiddenPort, PREFERRED_PORT } from './scripts/listen-port.mjs'
import { publicBrand } from './shared/utils/brand'

const brand = publicBrand(process.env)

function listenPort() {
  const raw = Number.parseInt(process.env.NUXT_PORT || process.env.PORT || String(PREFERRED_PORT), 10)
  if (!Number.isInteger(raw) || isForbiddenPort(raw)) {
    return PREFERRED_PORT
  }
  return raw
}

const port = listenPort()

export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    'nuxt-auth-utils',
  ],
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    databaseUrl: 'file:./data/renzo.sqlite',
    session: {
      password: process.env.NUXT_SESSION_PASSWORD || '',
      maxAge: 60 * 60 * 8,
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.SESSION_COOKIE_SECURE === 'true',
      },
    },
    public: {
      appName: brand.appName,
      brandName: brand.brandName,
      brandLocation: brand.brandLocation,
      publicTagline: brand.publicTagline,
      timezone: process.env.NUXT_PUBLIC_TIMEZONE || 'America/Denver',
      appEnv: process.env.NUXT_PUBLIC_APP_ENV || process.env.APP_ENV || 'dev',
    },
  },
  devServer: {
    port,
  },
  compatibilityDate: '2026-08-25',
  vite: {
    plugins: [tailwindcss()],
    server: {
      strictPort: true,
    },
  },
  eslint: {
    config: {
      stylistic: true,
    },
  },
})
