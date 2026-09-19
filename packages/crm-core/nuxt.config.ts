import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineNuxtConfig } from 'nuxt/config'

const root = dirname(fileURLToPath(import.meta.url))

export default defineNuxtConfig({
  css: [join(root, 'app/assets/css/staff-shell.css')],
})
