# Scan modes — CHECKION v3

## Status
Accepted (Phase 2 — live single + domain pipelines; Phase 3 — GEO launch on `/scan`; Phase 4 — capability-first launch IA: WCAG · GEO · SEO; Phase 5 — progressive disclosure on `/scan`)

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

1. **Capability picker** (primary) — large inviting tiles: **WCAG** · **GEO** · **SEO** (AUDION handoff locks to WCAG). Cold `/scan` (no `mode=`) starts with **capability tiles only** — none pre-selected; depth and compose stay unmounted until the user chooses. No visible “Capability” section label above the tiles (accessible name via `aria-label` only); no secondary hint/copy under the tiles; capability grid uses a bottom hairline only (no top rule).
2. **Progressive disclosure** (smooth `checkion-rise` / `checkion-launch-reveal`; `prefers-reduced-motion` disables animation):
   - **WCAG** → reveal depth tiles (**Quick single scan** · **Deep scan**); after depth is chosen (or immediately if depth was already chosen this session / via deep-link) → reveal compose.
   - **GEO** → reveal GEO compose (**queries**, **models**, CTA only); skip WCAG depth; **no URL + Project row** (see silent GEO fields below).
   - **SEO** → reveal compose (URL, project, CTA); skip depth.
   - Changing capability swaps/re-animates the secondary sections accordingly.
   - Deep-links with `mode=seo|geo|single|deep` (and AUDION handoff) **skip ahead** and show the full relevant chain on first paint — no empty trap for AUDION / handoff URLs.
3. **WCAG depth** (secondary, only when WCAG selected and not AUDION) — compact sibling tiles matching the capability aesthetic: **Quick single scan** · **Deep scan** (not a ToggleGroup strip). No visible “WCAG depth” section label above the tiles (accessible name via `aria-label` only); depth grid uses a bottom hairline only (no top rule), same as capability.
4. **Compose band** — editorial form unit below the pickers (mounted only when disclosure allows):
   - **URL** — hero input (page or host) — **WCAG / SEO only** (hidden for GEO)
   - **GEO extras** (when capability = GEO) — **Queries** as magazine editable list (`GeoQueryList`, Audion `PersonaEditableList` composition): one prompt per numbered row, inline edit, add, remove, **Suggest** (AI / fixture) · **Models** as compact selected chips + **Add model** dialog with provider toggle + search (`GeoModelPicker` / `lib/geo/model-catalog.ts`) — see `geo-model-catalog.md` — never a full-catalog chip wall
   - **Project** + **CTA** — Collection select beside launch action for WCAG / SEO; GEO CTA alone (project silent); destination status stays quiet

### GEO silent URL + project (no compose row)
`POST /api/geo-jobs` still requires `{ projectId, url, queries[] }`. When the URL+Project row is hidden:

| Field | How GEO launch fills it |
|-------|-------------------------|
| `projectId` | Silent state: deep-link `projectId` if it matches a known project, else the first / currently selected Collection project. No Project select UI. |
| `url` | `resolveGeoLaunchUrl()` — deep-link / prefilled `url` when present; else first query text that implies an `http(s)` URL or bare hostname; else demo fallback `https://www.bosch-ebike.com/de/` (same seed used for default queries). Suggest still receives this resolved URL. |
| `queries` / `models` | Visible GEO extras; empty queries fall back to `defaultGeoQueries(resolvedUrl)` client-side. |

Deep-links (`/scan?mode=geo&projectId=&url=`) still apply silently — they seed state and POST body without showing the row.

**Visual language:** magazine editorial — type, hairline rules, whitespace. Capability / depth selection via underline + ink weight (not filled color blocks). Stage `Panel` and compose band stay fill-free (no soft panel washes).

Primitives: `Panel` (transparent stage shell) · `Field` / `Input` / `Select` / `Button` · `SectionChrome` · `Dialog` · `EmptyState` · `Chip` · `ToggleGroup` · `Text` · `TopStatus` · `LoadingText` · `Alert` · capability + depth tiles as app composition (`checkion-capability-grid`, `checkion-depth-grid`, `checkion-launch-compose`) · GEO query list (`GeoQueryList` / `checkion-geo-query-list`) · GEO model picker (`GeoModelPicker` / `checkion-geo-model-picker`) · progressive `checkion-launch-reveal` / `checkion-rise` motion.

### GEO query list + Suggest
- Default rows: host-derived prompts (`defaultGeoQueries(url)`). Changing URL refreshes defaults only when the list still matches the previous host defaults.
- **Suggest** → `POST /api/geo/suggest-queries` `{ url, existing?, max? }` → dialog to Add / Add all.
- **Fixture behavior** (no `OPENAI_API_KEY`, CI / local dummy): returns host-derived pool beyond the three launch defaults; response `source: "fixture"`, `stubbed: true`.
- **Live Suggest** (`OPENAI_API_KEY` set): OpenAI prompt suggestions (`source: "openai"`); falls back to fixture pool on failure.
- Submit still posts `queries: string[]` to `POST /api/geo-jobs` (empty list falls back to host defaults client-side).

### GEO model chips
- Catalog: `lib/geo/model-catalog.ts` — OpenAI / Anthropic / Google current ids (August 2026); see `geo-model-catalog.md`.
- Default preselect: recommended set (`gpt-5.4-nano`). **Suggest** restores that set.
- Honest availability: OpenAI = Live; Anthropic / Google = Soon. Submit uses `modelsForLaunch()` → live-supported ids only (fallback to catalog default).
- Still posts `models: string[]` to `POST /api/geo-jobs`.

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
- Suggest (launch only): `POST /api/geo/suggest-queries` with `{ url, existing?, max? }` — see GEO query list above.

## Cross-product (AUDION)
AUDION may optionally trigger **`mode: single`** for a step URL (Chat-Inspect / Studies) via `POST /api/scans` or `/scan?projectId&mode=single&url=` — see `audion-journey-scan-trigger.md`. That path must **not** use `deep`, domain crawl, `geo`, or `seo`.

## Deferred
Dedicated SEO-only crawl (without full domain magazine), Journey agent live, performance-as-primary tab, reuse-cache polish, competitor cron, normalized `scan_issues` tables, multi-provider GEO cron.
