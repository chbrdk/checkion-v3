# Help tips — CHECKION v3

**Status:** Accepted — 2026-08-04  
**Implements:** `apps/web/lib/help-tips.ts` · `apps/web/components/help-tip.tsx`  
**DS:** `@msqdx/ui` `InfoTip` (language-agnostic) · `specs/domain/msqdx-ui-infotip.md`

## Decision

- **Tip body copy only** is bilingual (`en` / `de`).
- Locale from Settings prefs (`paths.localeStorageKey` / `useUserPrefs().locale`), fallback `en`.
- UI chrome (nav, buttons, band titles as visible English labels) stays English for now.
- DS `InfoTip` receives already-resolved `content` + English `label` (aria-label).

## Tip-ID convention

Dot namespaces, lowercase, stable:

| Prefix | Scope |
|--------|--------|
| `score.*` | Category score kinds (scoreline / RankedRow) |
| `lab.*` | Overview lab tiles (Freshness, Shield, UX, Eco, Links, …) |
| `vital.*` | Perf vitals (TTFB, FCP, LCP, …) |
| `reading.*` | CEFR / Clarity / Complexity |
| `geo.*` | GEO meters and competitive jargon |
| `detail.*` | Detail report band titles (short formula tips) |
| `domain.*` | Domain overview / detail metrics |
| `issue.*` | Issues layers + severity |
| `launch.*` | Scan launch capabilities / depth |
| `job.*` | Job status chips |

Examples: `score.accessibility`, `geo.discoverability`, `detail.performance`, `issue.severity.critical`.

## Inventory

### P0 (Wave A–B)

- Score kinds: accessibility, seo, performance, ux, eco, geo (`generative`), best_practices
- Lab: freshness, shield, cleared, ux, eco, links
- Vitals: ttfb, fcp, lcp, dom, load, scripts
- Reading: cefr, clarity
- GEO meters: discoverability, repurposing, score
- Detail band titles: ledger, scan, performance, seo, ux, eco, links, shield, freshness, geo, infra, class, cleared

### P1 (Wave C–E)

- Domain SEO coverage / distributions / E-E-A-T teasers
- GEO overview tiles, share of voice, E-E-A-T dimensions
- Issues layers + severity glossary

### P2 (Wave F)

- Launch WCAG / GEO / SEO + depth
- Job status chips

### Out of scope

Every breadcrumb, obvious button, or long prose block — tips only on jargon and metrics.

## Composition

- `HELP_TIPS: Record<TipId, { en: string; de: string; label: string }>`
- `useHelpTip(id)` → `{ content, label }` for current locale
- `LabelWithTip` / `MetricLabel` — visible label + DS `InfoTip`

## Acceptance

1. Locale `de` resolves German tip bodies; unknown / missing falls back to `en`.
2. Tip triggers expose `aria-label` from catalog `label`.
3. Specs inventory lists this file; `knowledge/paths.md` points at the catalog.
