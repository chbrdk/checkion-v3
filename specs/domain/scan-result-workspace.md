# Scan result workspace — CHECKION v3

## Status
Accepted (Phase 2) · Live single/domain pipelines write overview/issues/scores into jsonb · Single-scan magazine composition · Chapter 03 Detail report

## Live payload (Phase 2)
`POST /api/scans` / `POST /api/domain-scans` persist contract-shaped overview + issues via `lib/scan/adapt-scan-result.ts`. Magazine readers prefer `payload.overview` when present; fixtures still use `buildRichScanOverview`.

## IA
Overview → Issues → Detail. **No** Domain mega-page port.

## Magazine vs report (product rule)
Keep this split — do not blur it:

- **Overview = magazine** — narrative: what matters and why. Tension, priority, a few strong signals. Lab strip tiles are **teasers**, not spec dumps. Do not re-expand details already told in earlier spreads (e.g. readability/structure on “On the page”). Light enrichment of lab metas is fine; full field inventories are not.
- **Issues / Detail / future lens chapters = report/work** — actionable depth: exact findings, where, what to do; or the compact light-payload field inventory. Same folio frame, but inspectable (tables, filters, ledgers, definition-row bands) rather than essayistic.
- **Not** a separate “Report Mode” product surface, and **not** a v2 mega-tab dump back onto Overview. Later UX / Eco / Links report pages are **chapters that open**. GEO already gets a dedicated **magazine chapter** on Overview (stronger than a lab tile); deeper GEO report work still belongs in a future lens route. Chapter 03 Detail already surfaces the light GEO snapshot as one report band.

Faustregel: Overview → *was zählt und warum* · Issues/Detail/(Lenses) → *was genau, wo, was tun*.

## Routes
- `/results` → redirect home (no results index; discovery via Home / Projects / jobs)
- `/results/[id]` → redirect overview
- `/results/[id]/overview|issues|detail`
- `/domain/[id]/overview|issues|detail` (deep / light domain)
- Legacy `/scores` → redirect to `/detail`

## Single-scan composition (SoT)
Magazine article (`checkion-magazine--scan`):

1. **Magazine topbar** — breadcrumb + Share / Re-run / Delete (`ResultActions`) inside the article (not the global AppShell header)
2. **Hero** — `briefing-eyebrow`, URL headline, lede, `geo-places` facets (mode / status / score / completed)
3. **Section tabs** — Contents links (overview / issues / detail)
4. **Overview — editorial magazine** (rich light payload — see `single-scan-rich-overview.md`)
   - **Cover spread** — full-bleed capture + oversized overall score, host as masthead, classification deck, thin facets, folio mark
   - **Contents** — numbered editorial nav (01 Overview / 02 Issues / 03 Detail), not app tabs
   - **Opening** — scoreline (weakest-first) + sticky weakest-signal callout (score + LLM/fallback one-liner from opening-spread context; no tone accent bar)
   - **Margins & pace** — shared headline; Also noted | What slows as side-by-side metric chapters (thick mid rule, outer edges open)
   - **Feature** — On the page: story + typographic reading profile (CEFR mark, clarity track, complexity tiers, word count) — not metric tiles
   - **Lab strip** — UX / Eco / Links teasers only
   - **GEO chapter** — magazine lens: large score, data-aware lede, discoverability + repurposing meters, FAQ/llms presence chips (not a full report page yet)
   - **Pull quote** — lead finding bridge into “What breaks”
   - **What breaks** — magazine teaser of **distinct rule groups** (same axe/Pa11y rule collapsed; `affectedCount` = occurrences), ranked severity → count — not eight identical hits of one rule. Full per-node list stays on Issues.
5. **Issues (folio masthead)** — Chapter 02 dossier: **capture + issue overlays** beside lead pull-quote, severity tally, filters, accordion inspect. Click marker ↔ open finding. Heatmap / scanpath / PageIndex layers are future toggles on the same canvas — not a separate Contents chapter.
6. **Detail (folio masthead)** — Chapter 03 compact report: category ledger + stacked light-payload bands (not magazine essay, not v2 mega-tabs)

DS primitives via `@msqdx/ui`; product layout under `checkion-cover` / `checkion-folio` / `checkion-spread-*` / `checkion-dossier` / `checkion-report` / `checkion-issues-workspace`. **No** stacked report panels as the Overview spine.

## Chapter 02 Issues — visual inspect
- **Layout:** ≈80/20 stage — capture + visual layers take the wide column (full content width); compact findings rail on the side.
- **Canvas:** `screenshotUrl` at capture viewport (fixture 1400×900); markers from each issue’s `boundingBox`.
- **Layers (same canvas):** `Issues` (default) · `Heatmap` · `Regions`.
- **Sync:** click marker → expand rail row + show description; click rail row → highlight marker (forces Issues layer).
- **Not:** a fourth Contents route for “Visual”.

## Chapter 03 Detail — field inventory
Data from existing `ScanOverview` light snapshots. Visual overlays live on Issues, not Detail.

| Report block | Source | Fields |
|---|---|---|
| **Ledger** | `scores` + `scan.overallScore` | Weakest-first category cells + max + range |
| **Scan** | `scan` | URL, device, standard, runners, duration, issueStats, WCAG levels |
| **Capture** | `screenshotUrl` | Thumbnail |
| **Performance** | `performance` | TTFB, FCP, LCP, DOM, Load, INP, protocol, script KB |
| **SEO** | `seo` | Title/meta/H1/lengths/canonical/words/signals + OG/Twitter/robots.txt/sitemap/gaps/keywords |
| **UX** | `ux` | Core lab + dwell, hints, long-tasks, forms, media, images, font-display |
| **Eco** | `eco` | Grade, CO₂, weight, green host + source/checked/cleaner% |
| **Links** | `links` | Counts + PDF + broken/noopener samples |
| **Shield** | `securityPrivacy` | Core booleans + header matrix, SRI, cookies, privacy URL, CMP |
| **Freshness** | `freshness` | ageDays, confidence, source(s), bestAsOf |
| **GEO** | `generative` | Score axes + schema/llms/bots/FAQ/HowTo/Breadcrumb/YMYL |
| **Infra** | `infra` | IP, location, CDN, lang/hreflang, platforms, tracking |
| **Class / cleared** | `classification`, `passedChecks`, `deviceSiblings` | Tags/tiers, full cleared list, sibling devices |
