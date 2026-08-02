import type { ReactNode } from 'react'
import type { MetricTone } from './detail-metric-tone'

export type SearchableFact = {
  label: string
  value: ReactNode
  tone?: MetricTone
}

export type DetailSearchQuery = {
  raw: string
  tokens: string[]
  tones: MetricTone[] | null
}

const TONE_WORDS: Record<string, MetricTone> = {
  good: 'pos',
  ok: 'pos',
  pos: 'pos',
  pass: 'pos',
  clear: 'pos',
  warn: 'low',
  warning: 'low',
  mid: 'low',
  low: 'low',
  bad: 'neg',
  poor: 'neg',
  fail: 'neg',
  neg: 'neg',
  critical: 'neg',
  error: 'neg',
}

/** Extra terms that expand a token into related report vocabulary. */
const ALIASES: Record<string, string[]> = {
  lcp: ['largest contentful paint', 'performance'],
  fcp: ['first contentful paint', 'performance'],
  ttfb: ['time to first byte', 'performance'],
  inp: ['interaction', 'performance'],
  cls: ['cumulative layout shift', 'ux'],
  cwv: ['performance', 'vitals', 'lcp', 'fcp', 'cls'],
  vitals: ['performance', 'lcp', 'fcp', 'ttfb'],
  speed: ['performance', 'load'],
  https: ['shield', 'security'],
  hsts: ['shield', 'security'],
  csp: ['shield', 'security'],
  cookie: ['shield', 'cookies', 'privacy'],
  privacy: ['shield'],
  security: ['shield'],
  co2: ['eco', 'carbon'],
  carbon: ['eco', 'co2'],
  green: ['eco'],
  weight: ['eco', 'page weight'],
  seo: ['title', 'meta', 'canonical', 'og'],
  a11y: ['ux', 'accessibility', 'skip', 'heading'],
  accessibility: ['ux', 'skip', 'heading'],
  readable: ['readability', 'ux', 'cefr', 'clarity'],
  readability: ['ux', 'cefr', 'clarity'],
  cefr: ['readability', 'ux'],
  ai: ['geo', 'llm', 'generative'],
  llm: ['geo', 'llms.txt'],
  generative: ['geo'],
  hosting: ['infra', 'cdn', 'server'],
  cdn: ['infra'],
  broken: ['links'],
  noopener: ['links'],
  fresh: ['freshness', 'age'],
  stale: ['freshness', 'age'],
  passed: ['cleared', 'cleared checks'],
  clean: ['cleared', 'cleared checks'],
  score: ['ledger'],
  scores: ['ledger'],
  category: ['ledger'],
}

function reactNodeText(node: ReactNode): string {
  if (node == null || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(reactNodeText).join(' ')
  if (typeof node === 'object' && node !== null && 'props' in node) {
    const el = node as { props?: { children?: ReactNode } }
    return reactNodeText(el.props?.children)
  }
  return ''
}

export function factHaystack(fact: SearchableFact): string {
  return `${fact.label} ${reactNodeText(fact.value)}`.toLowerCase()
}

export function parseDetailQuery(raw: string): DetailSearchQuery {
  const cleaned = raw.trim().toLowerCase()
  if (!cleaned) return { raw: '', tokens: [], tones: null }

  const parts = cleaned.split(/\s+/).filter(Boolean)
  const tones: MetricTone[] = []
  const tokens: string[] = []

  for (const part of parts) {
    const tone = TONE_WORDS[part]
    if (tone) {
      if (!tones.includes(tone)) tones.push(tone)
      continue
    }
    tokens.push(part)
  }

  return {
    raw: cleaned,
    tokens,
    tones: tones.length ? tones : null,
  }
}

function expandToken(token: string): string[] {
  const aliases = ALIASES[token] ?? []
  return [token, ...aliases]
}

function textMatchesTokens(text: string, tokens: string[]): boolean {
  if (tokens.length === 0) return true
  return tokens.every((token) => {
    const expanded = expandToken(token)
    return expanded.some((term) => text.includes(term))
  })
}

function bandHaystack(title: string, aliases: string[], rows: SearchableFact[]): string {
  return [title, ...aliases, ...rows.map(factHaystack)].join(' ').toLowerCase()
}

export function filterFacts(
  rows: SearchableFact[],
  query: DetailSearchQuery,
  bandTitle: string,
  bandAliases: string[] = [],
): SearchableFact[] {
  if (!query.raw) return rows

  const withTone = (row: SearchableFact) =>
    !query.tones || (row.tone != null && query.tones.includes(row.tone))

  if (query.tokens.length === 0) {
    return rows.filter(withTone)
  }

  const rowHits = rows.filter(
    (row) => withTone(row) && textMatchesTokens(factHaystack(row), query.tokens),
  )
  if (rowHits.length > 0) return rowHits

  const bandMatched = textMatchesTokens(
    [bandTitle, ...bandAliases].join(' ').toLowerCase(),
    query.tokens,
  )
  if (bandMatched) return rows.filter(withTone)

  return []
}

export function bandVisible(
  title: string,
  aliases: string[],
  filteredRows: SearchableFact[],
  allRows: SearchableFact[],
  query: DetailSearchQuery,
): boolean {
  if (!query.raw) return allRows.length > 0
  if (filteredRows.length > 0) return true
  if (query.tones && query.tokens.length === 0) return false
  return textMatchesTokens(bandHaystack(title, aliases, allRows), query.tokens)
}

export function scoreMatches(
  label: string,
  kind: string,
  value: number,
  tone: MetricTone | undefined,
  query: DetailSearchQuery,
): boolean {
  if (!query.raw) return true
  if (query.tones && (!tone || !query.tones.includes(tone))) return false
  if (query.tokens.length === 0) return true
  const hay = `${label} ${kind} ${value} ledger score`.toLowerCase()
  return textMatchesTokens(hay, query.tokens)
}
