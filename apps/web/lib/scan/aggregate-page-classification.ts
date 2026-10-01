/**
 * Roll up per-page pageClassification into domain theme stats + magazine snapshot.
 * Spec: `specs/domain/page-classification-llm.md` · domain-scan-sections.md
 */
import type {
  DomainThemeRollup,
  DomainThemeStat,
  PageClassificationSnapshot,
} from '@checkion-v3/contracts'
import type { ScanResult, TagTier } from './types'

const BOILERPLATE_TAGS = new Set([
  'website',
  'homepage',
  'home',
  'page',
  'content',
  'services',
  'service',
  'company',
  'unternehmen',
  'startseite',
  'webseite',
  'website content',
])

const TOP_THEMES = 12

function themeKey(tag: string): string {
  return tag.trim().toLowerCase().replace(/\s+/g, ' ')
}

function isBoilerplate(key: string): boolean {
  return BOILERPLATE_TAGS.has(key)
}

function tierWeight(tier: number, key: string): number {
  const t = Math.max(1, Math.min(5, Math.round(tier)))
  const base = t * t
  return isBoilerplate(key) ? base * 0.25 : base
}

type Acc = {
  tag: string
  score: number
  pageCount: number
  maxTier: number
  tierSum: number
}

/**
 * Aggregate pageClassification.tagTiers across a deep-scan corpus.
 */
export function buildDomainThemeRollup(pages: ScanResult[]): DomainThemeRollup | undefined {
  if (!pages.length) return undefined

  const byKey = new Map<string, Acc>()
  let pagesWithClassification = 0

  for (const page of pages) {
    const tiers = page.pageClassification?.tagTiers
    if (!tiers?.length) continue
    pagesWithClassification += 1
    const seenOnPage = new Set<string>()
    for (const row of tiers) {
      const key = themeKey(row.tag)
      if (!key || key.length < 2) continue
      const tier = (Math.max(1, Math.min(5, Math.round(row.tier))) || 3) as TagTier['tier']
      let acc = byKey.get(key)
      if (!acc) {
        acc = { tag: key, score: 0, pageCount: 0, maxTier: tier, tierSum: 0 }
        byKey.set(key, acc)
      }
      acc.score += tierWeight(tier, key)
      acc.maxTier = Math.max(acc.maxTier, tier) as number
      acc.tierSum += tier
      if (!seenOnPage.has(key)) {
        seenOnPage.add(key)
        acc.pageCount += 1
      }
    }
  }

  if (pagesWithClassification === 0) return undefined

  const themes: DomainThemeStat[] = [...byKey.values()]
    .sort((a, b) => b.score - a.score || b.pageCount - a.pageCount || a.tag.localeCompare(b.tag))
    .slice(0, TOP_THEMES)
    .map((a) => ({
      tag: a.tag,
      pageCount: a.pageCount,
      score: Math.round(a.score * 10) / 10,
      maxTier: a.maxTier,
    }))

  if (!themes.length) return undefined

  return {
    totalPages: pages.length,
    pagesWithClassification,
    themes,
  }
}

/** Magazine cover + dossier snapshot from a theme rollup. */
export function classificationSnapshotFromThemeRollup(
  rollup: DomainThemeRollup,
): PageClassificationSnapshot {
  const tags = rollup.themes.map((t) => t.tag)
  const intensityTier = Math.max(1, ...rollup.themes.map((t) => t.maxTier))
  const top = tags.slice(0, 3).join(', ')
  const shortSummary =
    rollup.pagesWithClassification === rollup.totalPages
      ? `Top themes across ${rollup.totalPages} pages: ${top}.`
      : `${rollup.pagesWithClassification} of ${rollup.totalPages} pages classified · top: ${top}.`
  return {
    shortSummary,
    tags,
    intensityTier,
    tagTiers: rollup.themes.map((t) => ({
      tag: t.tag,
      tier: Math.max(1, Math.min(5, t.maxTier)),
    })),
  }
}
