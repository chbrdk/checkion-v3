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

  it('blanks runtime secrets only on the next build RUN (Coolify build-time ARG leak)', () => {
    const df = readFileSync(resolve(repoRoot, 'Dockerfile'), 'utf8')
    expect(df).toContain('npm ci --no-audit --no-fund --include=dev')
    // Scoped to the compile process — not ENV instructions that could poison layers.
    expect(df).toMatch(
      /RUN DATABASE_URL=\s*\\\s*\n\s*OPENAI_API_KEY=\s*\\\s*\n\s*PLEXON_SERVICE_SECRET=\s*\\\s*\n\s*PLEXON_AUTH_URL=\s*\\\s*\n\s*AUTH_SECRET=\s*\\\s*\n\s*npm run build/,
    )
    const runnerIdx = df.indexOf('AS runner')
    expect(runnerIdx).toBeGreaterThan(0)
    const runner = df.slice(runnerIdx)
    expect(runner).not.toMatch(/ENV PLEXON_AUTH_URL=/)
    expect(runner).not.toMatch(/ENV PLEXON_SERVICE_SECRET=/)
    expect(runner).not.toMatch(/ENV AUTH_SECRET=/)
    expect(runner).not.toMatch(/ENV DATABASE_URL=/)
  })

  it('keeps /login force-dynamic so Coolify runtime auth env is honored', () => {
    const login = readFileSync(resolve(repoRoot, 'apps/web/app/login/page.tsx'), 'utf8')
    expect(login).toContain("export const dynamic = 'force-dynamic'")
    expect(login).toContain('isPlexonAuthConfigured()')
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
