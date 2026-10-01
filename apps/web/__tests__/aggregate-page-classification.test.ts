import { describe, expect, it } from 'vitest'
import {
  buildDomainThemeRollup,
  classificationSnapshotFromThemeRollup,
} from '../lib/scan/aggregate-page-classification'
import { adaptDomainResultToContracts } from '../lib/scan/adapt-scan-result'
import type { DomainScanResultWithFullPages, ScanResult } from '../lib/scan/types'

function page(partial: Partial<ScanResult> & Pick<ScanResult, 'url'>): ScanResult {
  const { url, ...rest } = partial
  return {
    id: rest.id ?? 'p',
    url,
    timestamp: new Date().toISOString(),
    score: rest.score ?? 70,
    durationMs: 100,
    stats: rest.stats ?? { errors: 0, warnings: 0, notices: 0, total: 0 },
    issues: [],
    passes: [],
    ...rest,
  } as ScanResult
}

describe('aggregate-page-classification', () => {
  it('rolls up themes by weighted score and page count', () => {
    const pages = [
      page({
        url: 'https://example.com/a',
        pageClassification: {
          shortSummary: 'Heat pumps',
          tagTiers: [
            { tag: 'Heat pumps', tier: 5 },
            { tag: 'Homepage', tier: 2 },
            { tag: 'Boilers', tier: 3 },
          ],
        },
      }),
      page({
        url: 'https://example.com/b',
        pageClassification: {
          shortSummary: 'Boilers',
          tagTiers: [
            { tag: 'boilers', tier: 5 },
            { tag: 'Service', tier: 2 },
          ],
        },
      }),
      page({ url: 'https://example.com/c' }),
    ]
    const rollup = buildDomainThemeRollup(pages)
    expect(rollup?.pagesWithClassification).toBe(2)
    expect(rollup?.totalPages).toBe(3)
    expect(rollup?.themes[0]?.tag).toBe('boilers')
    expect(rollup?.themes.find((t) => t.tag === 'heat pumps')?.pageCount).toBe(1)
    // boilerplate homepage/service should rank lower than real themes
    const homeIdx = rollup!.themes.findIndex((t) => t.tag === 'homepage')
    const heatIdx = rollup!.themes.findIndex((t) => t.tag === 'heat pumps')
    if (homeIdx >= 0 && heatIdx >= 0) expect(heatIdx).toBeLessThan(homeIdx)

    const snap = classificationSnapshotFromThemeRollup(rollup!)
    expect(snap.tags[0]).toBe('boilers')
    expect(snap.shortSummary).toMatch(/2 of 3/)
  })

  it('wires themeRollup onto domain overview adapt', () => {
    const pages = [
      page({
        id: 'domain-1-p0',
        url: 'https://example.com/',
        pageClassification: {
          shortSummary: 'Home',
          tagTiers: [
            { tag: 'heating', tier: 5 },
            { tag: 'renewables', tier: 4 },
            { tag: 'installation', tier: 3 },
          ],
        },
      }),
    ]
    const domainResult = {
      id: 'domain-1',
      domain: 'example.com',
      timestamp: new Date().toISOString(),
      status: 'complete',
      progress: { scanned: 1, total: 1 },
      totalPages: 1,
      score: 80,
      pages,
      graph: { nodes: [], links: [] },
      systemicIssues: [],
    } as DomainScanResultWithFullPages

    const { overview } = adaptDomainResultToContracts(domainResult, {
      id: 'domain-1',
      projectId: 'proj-1',
      rootUrl: 'https://example.com/',
      startedAt: new Date().toISOString(),
    })
    expect(overview.themeRollup?.themes.map((t) => t.tag)).toContain('heating')
    expect(overview.classification?.tags).toContain('heating')
  })
})
