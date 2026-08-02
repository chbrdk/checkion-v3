/** Human-readable score formulas for Detail report band / ledger headlines. */

export const DETAIL_SCORE_FORMULAS: Record<string, string> = {
  ledger:
    'Overall = round(mean of category scores 0–100). Categories sorted weak → strong below.',
  scan:
    'Accessibility = 100 − (errors×10 + warnings×3 + notices×1) / pages. Page run score ≈ 100 − (E×2 + W×0.5 + N×0.1).',
  performance:
    'Ledger Performance = Lighthouse Performance 0–100. Band shows measured lab timings (TTFB / FCP / LCP / DOM / Load / INP).',
  seo:
    'Score = 40% meta coverage × indexability + 30% heading structure + 30% content depth (≥ 300 words).',
  ux:
    'Score = 100 − CLS (−10 / −25) − tap targets (−2 each, max −20) − not mobile (−20) − console (−5 each, max −20) − broken links (−10 each, max −30).',
  eco:
    'CO₂ g = transferGB × 0.81 × 0.75 × 442 (SWD). Grade A+…F by thresholds. Ledger Eco ≈ cleaner-than percentile.',
  links:
    'No composite score — inventory of total / broken / internal / external / missing noopener.',
  shield:
    'No composite score — HTTPS · HSTS · CSP · privacy · cookies · mixed content flags.',
  freshness:
    'No composite score — age from Last-Modified / JSON-LD / OG dates; confidence from source agreement.',
  geo:
    'Score = 0.52 × discoverability + 0.48 × repurposing (GEO dimensions).',
  infra:
    'No composite score — hosting / CDN / platform / tracking inventory.',
  class:
    'No composite score — tags · intensity · sibling device overalls.',
  cleared:
    'No composite score — runner checks that passed with zero findings.',
}

export function formulaForBand(id: string): string | undefined {
  const key = id.replace(/^report-/, '').replace(/\s+/g, '-')
  if (key === 'class-/-devices' || key.startsWith('class')) return DETAIL_SCORE_FORMULAS.class
  if (key === 'cleared-checks' || key.startsWith('cleared')) return DETAIL_SCORE_FORMULAS.cleared
  return DETAIL_SCORE_FORMULAS[key]
}
