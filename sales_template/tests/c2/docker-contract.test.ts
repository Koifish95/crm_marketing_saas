import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('C2 Sales docker contract', () => {
  it('builds crm-sales:c2 from the Sales Dockerfile and stores proposals on uploads', () => {
    const dockerfile = readFileSync(join(process.cwd(), 'Dockerfile'), 'utf8')
    expect(dockerfile).toMatch(/--filter sales-crm/)
    expect(dockerfile).toMatch(/COPY packages\/crm-core/)
    expect(dockerfile).toMatch(/pnpm exec esbuild docker\/runtime-init.ts/)
    expect(dockerfile).not.toMatch(/node node_modules\/esbuild\/bin\/esbuild/)
    expect(dockerfile).toMatch(/COPY --from=build \/src\/node_modules\/@libsql/)
    expect(dockerfile).toMatch(/ARG RELEASE_ID=dev/)
    expect(dockerfile).toMatch(/ENV RELEASE_ID=\$\{RELEASE_ID\}/)
    expect(dockerfile).not.toMatch(/renzo/i)
    expect(dockerfile).not.toMatch(/-v/)

    const compose = readFileSync(join(process.cwd(), 'docker-compose.provisioned.yml'), 'utf8')
    expect(compose).toMatch(/crm-sales:c2/)
    expect(compose).toMatch(/SALES_PROPOSALS_DIR: \/app\/data\/uploads\/proposals/)
    expect(compose).toMatch(/ASSET_UPLOAD_DIR: \/app\/data\/uploads/)
    expect(compose).toMatch(/DATABASE_URL: file:\/app\/data\/sqlite\/crm.sqlite/)
    expect(compose).toMatch(/\$\{HOST_PORT\}:5000/)
    expect(compose).not.toMatch(/renzo/i)
    expect(compose).not.toMatch(/down -v/)

    const entrypoint = readFileSync(join(process.cwd(), 'docker', 'entrypoint.sh'))
    expect(entrypoint.includes('\r')).toBe(false)
  })
})
