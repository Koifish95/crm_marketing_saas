import { existsSync, mkdirSync, writeFileSync } from 'node:fs'

/**
 * Nitro traces libsql's optional native packages for every OS.
 * pnpm only materializes the current platform, so the other OS path
 * is missing and the production build fails. Write a no-op stub so
 * tracing can finish; the running OS still loads its real binding.
 */
const packages = [
  '@libsql/win32-x64-msvc',
  '@libsql/linux-x64-gnu',
]

for (const name of packages) {
  const dir = `node_modules/${name}`
  if (existsSync(`${dir}/package.json`)) {
    continue
  }

  mkdirSync(dir, { recursive: true })
  writeFileSync(`${dir}/package.json`, `${JSON.stringify({
    name,
    version: '0.5.29',
    main: 'index.js',
  }, null, 2)}\n`)
  writeFileSync(`${dir}/index.js`, 'module.exports = {}\n')
}
