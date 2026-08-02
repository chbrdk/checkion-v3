# Scan modes — CHECKION v3

## Status
Accepted (Phase 2 — live single + domain pipelines; Phase 3 — GEO launch on `/scan`; Phase 4 — capability-first launch IA: SEO · GEO · WCAG)

## MVP modes (deep-link / API)
| Mode | Primary capability | Result |
|------|--------------------|--------|
| `seo` | SEO | `/domain/[id]/overview` via `POST /api/domain-scans` (SEO coverage chapter on domain magazine) |
| `geo` | GEO | `/geo/[id]/overview` via `POST /api/geo-jobs` |
| `single` | WCAG → Quick single | `/results/[id]/{overview\|issues\|detail}` via `POST /api/scans` |
| `deep` | WCAG → Deep scan | Same + `/domain/[id]/…` for light domain payload via `POST /api/scans` |

`geo` is a **launch mode** on the central form, not a `ScanMode` on accessibility scan rows. Product semantics stay in `geo-competitive-presence.md`.

`seo` is a **launch mode** that starts a domain crawl — the closest first-class SEO surface already shipped (corpus `seoCoverage` + `GET /api/domain-scans/:id/seo-reading`). There is no separate SEO-only pipeline yet.

## Launch UX (central magazine)
One composition on `/scan` (`ScanLaunchForm` / `checkion-magazine--launch`):

1. **Capability picker** (primary) — large inviting tiles: **SEO** · **GEO** · **WCAG** (AUDION handoff locks to WCAG)
2. **WCAG depth** (secondary, only when WCAG selected) — `ToggleGroup`: Quick single scan · Deep scan
3. **URL** — page or host to evaluate / cite against
4. **Project** — CHECKION Collection capability
5. **GEO extras** (when capability = GEO) — queries (one per line; sensible defaults from host) · optional models (default `OPENAI_MODEL` / `gpt-5.4-nano`)
6. **CTA** — launches the selected path; secondary demo jumps stay quiet (fixture result links)

Primitives: `Panel` · `SectionChrome` · `ToggleGroup` (WCAG depth only) · `Field` / `Input` / `Textarea` / `Select` / `Button` · `Text` · `TopStatus` · `LoadingText` · `Alert` · capability tiles as app composition (`checkion-capability-grid`) · light `checkion-rise` motion.

Deep-links (`paths.routes.scanLaunch`):
- `projectId`, `mode=seo|geo|single|deep`, `url`
- Legacy aliases preserved: `mode=single|deep|geo` map into WCAG depth / GEO; `mode=seo` selects SEO
- AUDION correlation: `platformProjectId`, `audionRunId`, `stepUrl` (forces WCAG + Quick single; never deep / GEO / SEO)

## Live vs fixture
### Scans (`single` / `deep` — WCAG)
- Gate: `lib/scan/live-scan-gate.ts` — live when `DATABASE_URL` **or** `CHECKION_LIVE_SCANS=1`; `CHECKION_LIVE_SCANS=0` forces synthesize.
- Live path: queued row → Puppeteer/Pa11y/axe (`lib/scan/scanner.ts`) or spider (`lib/scan/spider.ts`) → adapt → jsonb on `scans` / `domain_scans`.
- `POST /api/domain-scans` starts domain crawls; deep `POST /api/scans` delegates to the same start helper.
- Fixture synthesize remains for local demos and CI (no Chromium).

### SEO (`seo`)
- Same live/fixture domain pipeline as `POST /api/domain-scans`.
- Launch opens the domain magazine where SEO coverage is a first-class chapter (`domain-scan-sections.md`).

### GEO (`geo`)
- Gate: `lib/geo-eeat/live-geo-gate.ts` — live when `DATABASE_URL` **or** `CHECKION_LIVE_GEO=1`; `CHECKION_LIVE_GEO=0` forces synthesize.
- Live requires `OPENAI_API_KEY`; fixture path synthesizes a completed magazine overview instantly.
- Create: `POST /api/geo-jobs` with `{ projectId, url, queries[], models?, competitors?, title? }`.

## Cross-product (AUDION)
AUDION may optionally trigger **`mode: single`** for a step URL (Chat-Inspect / Studies) via `POST /api/scans` or `/scan?projectId&mode=single&url=` — see `audion-journey-scan-trigger.md`. That path must **not** use `deep`, domain crawl, `geo`, or `seo`.

## Deferred
Dedicated SEO-only crawl (without full domain magazine), Journey agent live, performance-as-primary tab, reuse-cache polish, competitor cron, normalized `scan_issues` tables, multi-provider GEO cron.
