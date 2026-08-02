/** @vitest-environment node */
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { paths } from '../lib/paths'

const repoRoot = resolve(__dirname, '../../..')

describe('Dockerfile Coolify packaging', () => {
  it('ships Dockerfile and dockerignore at repo root', () => {
    expect(existsSync(resolve(repoRoot, 'Dockerfile'))).toBe(true)
    expect(existsSync(resolve(repoRoot, '.dockerignore'))).toBe(true)
  })

  it('documents staging domain and clones msqdx-ui', () => {
    const df = readFileSync(resolve(repoRoot, 'Dockerfile'), 'utf8')
    expect(df).toContain('checkion-v3.projects-a.plygrnd.tech')
    expect(df).toContain('msqdx-ui')
    expect(df).toContain('EXPOSE 3007')
    expect(df).toContain('git clone')
    expect(df).toContain('docker-entrypoint.sh')
    expect(df).toContain('apps/web/drizzle.config.ts')
    expect(df).toContain('libnss3')
    expect(df).toContain('PUPPETEER_SKIP_DOWNLOAD')
    expect(df).toMatch(/docker-entrypoint\.sh|npm run start -w web/)
  })

  it('blanks runtime secrets before next build (Coolify build-time ARG leak)', () => {
    const df = readFileSync(resolve(repoRoot, 'Dockerfile'), 'utf8')
    const buildIdx = df.indexOf('RUN npm run build')
    expect(buildIdx).toBeGreaterThan(0)
    const beforeBuild = df.slice(0, buildIdx)
    expect(beforeBuild).toContain('ENV DATABASE_URL=')
    expect(beforeBuild).toContain('npm ci --no-audit --no-fund --include=dev')
  })

  it('keeps DataTable off the RSC @msqdx/ui barrel', () => {
    const barrel = readFileSync(resolve(repoRoot, 'apps/web/lib/msqdx-ui.ts'), 'utf8')
    const client = readFileSync(resolve(repoRoot, 'apps/web/lib/msqdx-ui-client.ts'), 'utf8')
    expect(barrel).not.toMatch(/export \{[^}]*DataTable/)
    expect(client).toContain("'use client'")
    expect(client).toContain('DataTable')
  })

  it('keeps health path for Traefik probes', () => {
    expect(paths.routes.apiHealth).toBe('/api/health')
  })
})
