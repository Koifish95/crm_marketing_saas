import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const coreRoot = fileURLToPath(new URL('../../../packages/crm-core', import.meta.url))
const forbidden = /(?:from|import)\s+['"][^'"]*(?:martial_arts_template|\/sales\/|\/beauty\/)/

function walk(dir: string, acc: string[] = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.nuxt' || name === 'dist') {
      continue
    }
    const full = join(dir, name)
    if (statSync(full).isDirectory()) {
      walk(full, acc)
    } else if (/\.(ts|vue|mjs|js)$/.test(name)) {
      acc.push(full)
    }
  }
  return acc
}

describe('C1 Core dependency direction', () => {
  it('does not import Martial Arts, Sales, or Beauty', () => {
    const files = walk(coreRoot)
    expect(files.length).toBeGreaterThan(0)
    const hits: string[] = []
    for (const file of files) {
      const text = readFileSync(file, 'utf8')
      if (forbidden.test(text)) {
        hits.push(relative(coreRoot, file))
      }
    }
    expect(hits).toEqual([])
  })
})
