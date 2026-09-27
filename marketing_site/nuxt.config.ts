import tailwindcss from '@tailwindcss/vite'

const port = Number.parseInt(process.env.NUXT_PORT || process.env.PORT || '5050', 10)

export default defineNuxtConfig({
  modules: ['@nuxt/eslint'],
  devtools: { enabled: false },
  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/mark.svg' }],
      meta: [{ name: 'theme-color', content: '#0c1828' }],
    },
  },
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    public: {
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:5050',
      siteName: 'Nuxxion',
      analyticsEnabled: process.env.NUXT_PUBLIC_ANALYTICS_ENABLED === 'true',
    },
  },
  devServer: {
    port: Number.isInteger(port) ? port : 5050,
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
