import { describe, expect, it } from 'vitest'
import {
  adaptDomainResultToContracts,
  buildDomainSeoCoverage,
  mapDomainEeatAggregate,
} from '../lib/scan/adapt-scan-result'
import type { DomainScanResultWithFullPages, ScanResult } from '../lib/scan/types'

function page(partial: Partial<ScanResult> & Pick<ScanResult, 'url'>): ScanResult {
  const { url, ...rest } = partial
  return {
    id: rest.id ?? 'p',
    url,
    timestamp: new Date().toISOString(),
    score: rest.score ?? 70,
    durationMs: 100,
    stats: rest.stats ?? { errors: 1, warnings: 2, notices: 0, total: 3 },
    issues: rest.issues ?? [],
    passes: [],
    ...rest,
  } as ScanResult
}

describe('domain overview aggregates', () => {
  it('builds seoCoverage from page SEO signals', () => {
    const pages = [
      page({
        url: 'https://example.com/',
        seo: {
          title: 'Home',
          metaDescription: 'Welcome',
          h1: 'Hello',
          canonical: 'https://example.com/',
          ogTitle: 'Home',
          ogDescription: null,
          ogImage: null,
          twitterCard: 'summary',
          bodyWordCount: 120,
          keywordAnalysis: {
            totalWords: 120,
            topKeywords: [{ keyword: 'hello', count: 4, densityPercent: 3 }],
            keywordPresence: [],
          },
        },
      }),
      page({
        url: 'https://example.com/about',
        seo: {
          title: 'Home',
          metaDescription: 'About us',
          h1: null,
          canonical: 'https://example.com/wrong',
          ogTitle: null,
          ogDescription: null,
          ogImage: null,
          twitterCard: null,
          bodyWordCount: 80,
        },
      }),
    ]
    const seo = buildDomainSeoCoverage(pages)
    expect(seo?.totalPages).toBe(2)
    expect(seo?.withTitle).toBe(2)
    expect(seo?.withH1).toBe(1)
    expect(seo?.missingH1Count).toBe(1)
    expect(seo?.duplicateTitleGroupCount).toBe(1)
    expect(seo?.canonicalMismatchCount).toBe(1)
    expect(seo?.topKeywords?.[0]).toBe('hello')
  })

  it('maps spider eeat into contracts shape', () => {
    const mapped = mapDomainEeatAggregate(
      {
        trust: {
          pagesWithImpressum: 2,
          pagesWithContact: 3,
          pagesWithPrivacy: 1,
          totalPages: 4,
        },
        experience: {
          pagesWithAbout: 2,
          pagesWithTeam: 1,
          pagesWithCaseStudyMention: 0,
          totalPages: 4,
        },
        expertise: {
          pagesWithAuthorBio: 0,
          pagesWithArticleAuthor: 1,
          avgCitationsPerPage: 0.25,
          totalPages: 4,
        },
      },
      4,
    )
    expect(mapped?.totalPages).toBe(4)
    expect(mapped?.trust.pagesWithContact).toBe(3)
    expect(mapped?.expertise.avgCitationsPerPage).toBe(0.25)
  })

  it('adaptDomainResultToContracts includes SEO and Trust/GEO chapters', () => {
    const pages = [
      page({
        url: 'https://shop.example/',
        score: 60,
        seo: {
          title: 'Shop',
          metaDescription: 'Buy stuff',
          h1: 'Shop',
          canonical: 'https://shop.example/',
          ogTitle: 'Shop',
          ogDescription: null,
          ogImage: 'https://shop.example/og.png',
          twitterCard: 'summary_large_image',
          bodyWordCount: 200,
        },
        generative: {
          score: 55,
          dimensions: { discoverability: 70, repurposing: 40 },
          technical: {
            hasLlmsTxt: false,
            hasRobotsAllowingAI: true,
            schemaCoverage: ['Organization'],
          },
          content: { faqCount: 0, tableCount: 1, listDensity: 0.1, citationDensity: 0.2 },
          expertise: { hasAuthorBio: false, hasExpertCitations: false },
        },
        eeatSignals: {
          hasImpressum: true,
          hasContact: true,
          hasAboutLink: true,
          hasTeamLink: false,
          hasCaseStudyMention: false,
        },
        privacy: {
          hasPrivacyPolicy: true,
          hasCookieBanner: false,
          privacyPolicyUrl: 'https://shop.example/privacy',
          hasTermsOfService: true,
        },
        performance: { ttfb: 100, fcp: 200, lcp: 400, domLoad: 350, windowLoad: 500 },
        ux: {
          score: 62,
          cls: 0.01,
          readability: { grade: 'Standard (High School)', score: 9 },
          tapTargets: { issues: [] },
          viewport: { isMobileFriendly: true, issues: [] },
          consoleErrors: [],
          brokenLinks: [],
          focusOrder: [],
        },
      }),
    ]

    const domainResult: DomainScanResultWithFullPages = {
      id: 'domain-test',
      domain: 'https://shop.example',
      timestamp: new Date().toISOString(),
      status: 'complete',
      progress: { scanned: 1, total: 1 },
      totalPages: 1,
      score: 60,
      pages,
      graph: { nodes: [], links: [] },
      systemicIssues: [{ issueId: 'color-contrast', title: 'Contrast', count: 1, pages: [pages[0]!.url] }],
      eeat: {
        trust: {
          pagesWithImpressum: 1,
          pagesWithContact: 1,
          pagesWithPrivacy: 1,
          totalPages: 1,
        },
        experience: {
          pagesWithAbout: 1,
          pagesWithTeam: 0,
          pagesWithCaseStudyMention: 0,
          totalPages: 1,
        },
        expertise: {
          pagesWithAuthorBio: 0,
          pagesWithArticleAuthor: 0,
          avgCitationsPerPage: 0.2,
          totalPages: 1,
        },
      },
    }

    const adapted = adaptDomainResultToContracts(domainResult, {
      id: 'domain-test',
      projectId: 'proj-1',
      rootUrl: 'https://shop.example/',
      startedAt: new Date().toISOString(),
    })

    expect(adapted.overview.seoCoverage?.withTitle).toBe(1)
    expect(adapted.overview.eeat?.trust.pagesWithImpressum).toBe(1)
    expect(adapted.overview.generative?.score).toBe(55)
    expect(adapted.overview.generative?.discoverability).toBe(70)
    expect(adapted.overview.performance?.avgLcp).toBe(400)
    expect(adapted.overview.securityPrivacy?.https).toBe(true)
  })
})
