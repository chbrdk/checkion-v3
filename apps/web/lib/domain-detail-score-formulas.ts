export const DOMAIN_DETAIL_SCORE_FORMULAS: Record<string, string> = {
  ledger:
    'Domain overall = crawl score from aggregated page runs. Category rows = lens scores over the corpus.',
  corpus:
    'Pages scanned · issue groups · total runner errors across all single-page scans in the deep crawl.',
  performance:
    'Averages of lab timings (TTFB / FCP / LCP / DOM) across measured pages — not one URL.',
  seo:
    'Coverage = share of pages with title / H1 / meta / canonical. Conflicts = mismatch & duplicate group counts.',
  ux:
    'Corpus UX score + readability band counts + pages with skipped headings / multiple H1.',
  eco: 'Avg CO₂ and page weight; grade distribution across the crawl.',
  links: 'Sum of internal / external / broken links discovered across pages.',
  shield: 'Corpus security & privacy flags (CSP share, cookie banner, privacy policy presence).',
  eeat: 'E-E-A-T page counts: contact / privacy / impressum / about / team / citations.',
  geo: 'Domain GEO = 0.52 × avg discoverability + 0.48 × avg repurposing across pages.',
  infra: 'Hosting / CDN / platform inventory sampled from the crawl.',
  class: 'Theme rollup and tag intensity from page classification.',
  samples: 'Weakest page samples from the crawl (teaser — not full slim table).',
}

export function domainFormulaForBand(id: string): string | undefined {
  const key = id.replace(/^report-/, '').replace(/\s+/g, '-')
  return DOMAIN_DETAIL_SCORE_FORMULAS[key]
}
