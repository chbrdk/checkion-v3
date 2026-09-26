import { describe, expect, it } from 'vitest'

/**
 * Mirror of spider corpus SEO checks for unit coverage without Puppeteer.
 * Spec: specs/domain/seo-market-program.md Phase 6 / OpenSEO audit 80/20 in Checkion spider.
 */
function corpusSeoIssues(
  pages: Array<{
    url: string
    broken?: number
    redirectCount?: number
    wordCount?: number
    skinny?: boolean
  }>,
  graph: { links: Array<{ source: string; target: string }> },
) {
  const systemic: Array<{ issueId: string; count: number }> = []
  const broken = pages.filter((p) => (p.broken ?? 0) > 0)
  if (broken.length) {
    systemic.push({ issueId: 'seo-broken-internal-links', count: broken.length })
  }
  const redirects = pages.filter((p) => (p.redirectCount ?? 0) >= 2)
  if (redirects.length) {
    systemic.push({ issueId: 'seo-redirect-chains', count: redirects.length })
  }
  const hasInlink = new Set(graph.links.map((l) => l.target))
  const orphans = pages.filter((p) => !hasInlink.has(p.url))
  if (orphans.length > 0 && orphans.length < pages.length) {
    systemic.push({ issueId: 'seo-orphan-pages', count: orphans.length })
  }
  const thin = pages.filter((p) => p.skinny || (p.wordCount != null && p.wordCount < 50))
  if (thin.length >= Math.ceil(pages.length / 4) && pages.length > 1) {
    systemic.push({ issueId: 'seo-thin-content', count: thin.length })
  }
  return systemic
}

describe('corpus SEO issue engine', () => {
  it('flags broken links and orphans', () => {
    const pages = [
      { url: 'https://ex.com/', broken: 0, wordCount: 200 },
      { url: 'https://ex.com/a', broken: 2, wordCount: 200 },
      { url: 'https://ex.com/orphan', broken: 0, wordCount: 10, skinny: true },
    ]
    const issues = corpusSeoIssues(pages, {
      links: [{ source: 'https://ex.com/', target: 'https://ex.com/a' }],
    })
    expect(issues.some((i) => i.issueId === 'seo-broken-internal-links')).toBe(true)
    expect(issues.some((i) => i.issueId === 'seo-orphan-pages')).toBe(true)
    expect(issues.some((i) => i.issueId === 'seo-thin-content')).toBe(true)
  })
})
