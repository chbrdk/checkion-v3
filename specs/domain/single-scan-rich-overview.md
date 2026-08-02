# Single-scan rich overview — CHECKION v3

## Status
Accepted (dummy corpus) — magazine MVP, **not** v2 mega-page

## Source
Distilled from CHECKION `lib/types.ts` `ScanResult` + result tabs (overview / list / seo / infra / generative signals).

## Keep (3 sections)
`overview` · `issues` · `detail` — no 9-tab shell. Legacy `/scores` redirects to `/detail`.

## Overview payload (`ScanOverview`)
Beyond scores + top issues, light snapshots:

| Band | Contract |
|------|----------|
| Provenance | `scan.device`, `standard`, `runners`, `durationMs`, `groupId`, `issueStats` (+ optional `byWcagLevel`) |
| Performance | `performance` (ttfb, fcp, lcp, loads, inp, protocol, scripts) |
| SEO | `seo` (+ OG/Twitter, robots.txt, sitemap, schema gaps, keywords) |
| Eco | `eco` (+ green source/checked, cleanerThan%) |
| UX lab | `ux` (+ dwell, hints, long-tasks, forms, media, images). Magazine normalizes CHECKION Flesch–Kincaid `grade`/`score` → CEFR mark (`A1`–`C2`) + clarity 0–100 (`lib/readability-cefr.ts`). |
| Links | `links` (+ total/PDF + samples) |
| Security / privacy | `securityPrivacy` (+ headers, SRI, CMP, privacy URL) |
| Freshness | `freshness` (+ bestAsOf, sources) |
| GEO | `generative` (+ HowTo/Breadcrumb/schemas/bots/YMYL) |
| Infra | `infra` (IP, geo, CDN, platforms, tracking) |
| Classification | `classification` (+ tagTiers) |
| Visual | `screenshotUrl` + `visualLayers` (heatmap / regions / scanpath) for Issues canvas |
| Devices | `deviceSiblings` |
| Validated | `passedChecks` full list |

## Issues
`IssueSummary` adds `context`, `runner`, `wcagLevel`, `helpUrl`, `boundingBox` (v2 parity for inspect accordion).

## Deferred (still out of magazine MVP / Detail v1)
Live saliency generation job (fixture heatmap ships on Issues canvas), StructureMap dump, PDF export, LLM UX/CX narrative tab, full GenerativeOptimizer scoreBreakdown tooltips, full Security header *values* (presence-only in light Shield).
