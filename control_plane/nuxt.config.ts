import { LISTEN_HOST, LISTEN_PORT } from './shared/utils/listen'

export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
  ],
  devtools: { enabled: false },
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    databaseUrl: 'file:./data/control-plane.sqlite',
    public: {
      appName: 'SaaS Control Plane',
    },
  },
  devServer: {
    host: LISTEN_HOST,
    port: LISTEN_PORT,
  },
  compatibilityDate: '2026-08-25',
  vite: {
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
