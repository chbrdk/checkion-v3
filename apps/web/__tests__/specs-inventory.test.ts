import { existsSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const repoRoot = path.resolve(__dirname, '../../..')

const requiredSpecs = [
  'specs/domain/app-shell.md',
  'specs/domain/project-workspace.md',
  'specs/domain/scan-modes.md',
  'specs/domain/scan-result-workspace.md',
  'specs/domain/single-scan-rich-overview.md',
  'specs/domain/domain-scan-sections.md',
  'specs/domain/scoring.md',
  'specs/domain/ds-component-gaps.md',
  'specs/domain/plexon-federation.md',
  'specs/domain/journey-agent-island.md',
  'specs/domain/share-links.md',
  'specs/domain/settings.md',
  'specs/domain/settings-api-tokens.md',
  'specs/domain/edit-dialogs.md',
  'specs/domain/geo-eeat.md',
  'specs/domain/geo-competitive-presence.md',
  'specs/domain/geo-answer-insights.md',
  'specs/domain/journey-ui.md',
  'specs/domain/project-reports.md',
  'specs/api/projects.md',
  'specs/api/scans.md',
  'specs/api/domain-scans.md',
  'specs/api/domain-scan-payload.md',
  'specs/api/share.md',
  'specs/api/tokens.md',
  'knowledge/specs-index.md',
  'knowledge/paths.md',
  'knowledge/settings-api-tokens.md',
  'knowledge/workspace-slice-pattern.md',
  'knowledge/v2-v3-runtime-separation.md',
  'knowledge/scan-migration-map.md',
  'knowledge/domain-result-migration-map.md',
  'knowledge/project-hub-migration-map.md',
  'knowledge/staging-coolify.md',
  'knowledge/ci.md',
  'knowledge/ds-component-gaps.md',
  'knowledge/dummy-data-mode.md',
] as const

describe('specs inventory', () => {
  it('keeps accepted domain/api specs and knowledge indexes on disk', () => {
    for (const rel of requiredSpecs) {
      expect(existsSync(path.join(repoRoot, rel)), `missing ${rel}`).toBe(true)
    }
  })

  it('registers MVP routes in paths.ts', async () => {
    const { paths } = await import('../lib/paths')
    expect(paths.brandLabel).toBe('CHECKION')
    expect(paths.routes.projects).toBe('/projects')
    expect(paths.routes.projectDetail('p1')).toBe('/projects/p1')
    expect(paths.routes.scan).toBe('/scan')
    expect(paths.routes.scanLaunch({ mode: 'geo' })).toBe('/scan?mode=geo')
    expect(paths.routes.resultSection('s1', 'overview')).toBe('/results/s1/overview')
    expect(paths.routes.resultSection('s1', 'detail')).toBe('/results/s1/detail')
    expect(paths.routes.domainSection('d1', 'issues')).toBe('/domain/d1/issues')
    expect(paths.routes.domainSection('d1', 'detail')).toBe('/domain/d1/detail')
    expect(paths.routes.apiScans).toBe('/api/scans')
    expect(paths.routes.shareDetail('tok')).toBe('/share/tok')
    expect(paths.routes.apiShare).toBe('/api/share')
    expect(paths.dataSource).toBe('fixtures')
    expect(paths.federationMode).toBe('dummy')
    expect(paths.routes.domain).toBe('/domain')
    expect(paths.routes.geo).toBe('/geo')
    expect(paths.routes.geoSection('geo-1', 'overview')).toBe('/geo/geo-1/overview')
    expect(paths.routes.geoSection('geo-1', 'queries')).toBe('/geo/geo-1/queries')
    expect(paths.routes.geoQueriesPrompt('geo-1', 'Best paint', 'gpt-5.4')).toBe(
      '/geo/geo-1/queries?q=Best%20paint&model=gpt-5.4',
    )
    expect(paths.routes.journey).toBe('/journey')
    expect(paths.routes.reports).toBe('/reports')
    expect(paths.federationContract).toBe('2026-05-plexon-federation-v3')
  })
})
