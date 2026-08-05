# Scan modes — CHECKION v3

## Status
Accepted (Phase 2 — live single + domain pipelines; Phase 3 — GEO launch on `/scan`; Phase 4 — capability-first launch IA: WCAG · GEO · SEO; Phase 5 — progressive disclosure on `/scan`; Phase 6 — GEO compose requires URL **or** company name + Project; Phase 7 — launch / re-run notification center)

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
   - **GEO** → reveal GEO compose (**URL and/or Company name**, **Project**, **queries**, **models**, CTA); skip WCAG depth.
   - **SEO** → reveal compose (URL, project, CTA); skip depth.
   - Changing capability swaps/re-animates the secondary sections accordingly.
   - Deep-links with `mode=seo|geo|single|deep` (and AUDION handoff) **skip ahead** and show the full relevant chain on first paint — no empty trap for AUDION / handoff URLs. Prefills still seed visible fields (not silent-only).
3. **WCAG depth** (secondary, only when WCAG selected and not AUDION) — compact sibling tiles matching the capability aesthetic: **Quick single scan** · **Deep scan** (not a ToggleGroup strip). No visible “WCAG depth” section label above the tiles (accessible name via `aria-label` only); depth grid uses a bottom hairline only (no top rule), same as capability.
4. **Compose band** — editorial form unit below the pickers (mounted only when disclosure allows):
   - **URL** — hero input (page or host) — WCAG / SEO required; GEO optional when Company name is set
   - **GEO Company name** — hero input beside URL; optional when URL is set. At least one of URL **or** Company name is required to start
   - **GEO extras** (when capability = GEO) — **Queries** as magazine editable list (`GeoQueryList`, Audion `PersonaEditableList` composition): one prompt per numbered row, inline edit, add, remove, **Suggest** (AI / fixture) · **Models** as compact selected chips + **Add model** dialog with provider toggle + search (`GeoModelPicker` / `lib/geo/model-catalog.ts`) — see `geo-model-catalog.md` — never a full-catalog chip wall
   - **Project** + **CTA** — Collection select beside launch action for WCAG / SEO / GEO (same 60/40 hero sizing; GEO row may be URL · Company · Project). Destination status stays quiet

### GEO compose validation (visible URL / company / project)
`POST /api/geo-jobs` accepts `{ url?, companyName?, queries[], projectId?, models?, … }`. Launch form rules:

| Field | Rule |
|-------|------|
| URL **or** Company name | At least one required (clear validation / disabled Start when both empty). URL alone is enough; company alone is enough (server derives a normalized citation URL from the company slug and stores `companyName` for brand / title / Suggest). |
| Project | Optional. Defaults to **no selection** (placeholder “Select or create project…”). Dropdown lists existing Collection projects; **+ New project** opens the shared create dialog (name / domain / description, prefilled from company or host when available) and selects the created id. Start stays enabled when URL or company is set; when Project is still empty on submit, omit `projectId` and the API **auto-creates** from the target host / company (session / `PLEXON_DEMO_COMPANY_ID` for federation) — info Alert documents this. Deep-link `projectId` still prefills when valid. WCAG / SEO project select is unchanged (still auto-picks first when present). |
| `queries` / `models` | Visible GEO extras; empty queries fall back to brand-derived defaults client-side (`defaultGeoQueries`, preferring company name when set). |

Deep-links (`/scan?mode=geo&projectId=&url=`) still prefill URL + Project on the **visible** compose row — not silent-only.

Suggest and create both receive URL + optional `companyName` and optional project context (`name`, `domain`) so prompts stay brand-aware — see `specs/api/geo-suggest-queries.md`.

Launch failures surface the API `detail` (or a clear auth/HTML warning) in an `Alert`.

## Launch + re-run behavior
Asynchronous jobs (`single`, `deep`, `seo`, `geo`) must not pretend to be done just because an id exists.

1. **No forced immediate redirect on create** — when `POST /api/scans`, `POST /api/domain-scans`, or `POST /api/geo-jobs` returns a queued/running resource, the user stays on the initiating surface (`/scan`, result re-run dialog, project workspace action, etc.).
2. **Global notification center** — every queued/running job is registered in a client-side **Notification center** opened from the **NavRail Jobs** control (footer, above Settings). It replaces the old snackbar-only / topbar approach with:
   - short toast/snackbar feedback when a job is queued, starts running, completes, or fails
   - a persistent center listing all in-progress and recent jobs
   - deep scans / domain crawls surface honest crawl progress while running: `scanned/total` plus the current page URL being processed, rather than a generic `running` label only
   - deep-links from each job row to the relevant result surface (`/results/:id/overview`, `/domain/:id/overview`, `/geo/:id/overview`)
3. **Result pages remain valid monitors** — if the user explicitly opens a running result page, the page shows an honest in-progress state and polls until completion/failure (same principle already used for GEO).
4. **Scope** — applies to:
   - central `/scan` launches
   - result/detail re-runs
   - project workspace CTAs
   - future product entry points that start these same APIs
5. **Status language** — queued/running/completed/failed must be reflected consistently in both the notification center and the relevant result page. An empty queued shell is never rendered as a completed success state.
6. **Restart honesty (Phase 7a)** — background deep/domain crawls do not silently survive an app redeploy. On the next read after a process restart, stale `queued` / `running` crawls from the previous worker session must be auto-marked `failed` with a clear interruption reason, so users never see orphaned “running forever” jobs.
7. **Restart CTA (Phase 7b)** — interrupted domain/deep jobs expose a direct restart path in both the Notification center and the domain result chrome. This is an honest restart of the crawl from the same root URL and project, not yet a checkpoint resume.
8. **Deep crawl control (Phase 7c — v2 parity)** — live domain crawls support `POST /api/domain-scans/:id/control` with `pause` | `resume` | `cancel`. The spider polls DB status via `getScanControl` (same process — resume unpause, not checkpoint after redeploy). UI: Notification center + domain result chrome expose Pause / Resume / Cancel while `queued` | `running` | `paused` | `cancelling`. `GET /api/projects/:id/domain-scans/active` lists in-flight crawls for workspace parity.
9. **Screenshot persistence (ops)** — Coolify must mount a volume at `SCAN_SCREENSHOTS_PATH` (default `data/screenshots`) so JPEG captures survive redeploys.

**Visual language:** magazine editorial — type, hairline rules, whitespace. Capability / depth selection via underline + ink weight (not filled color blocks). Stage `Panel` and compose band stay fill-free (no soft panel washes).

Primitives: `Panel` (transparent stage shell) · `Field` / `Input` / `Select` / `Button` · `SectionChrome` · `Dialog` · `EmptyState` · `Chip` · `ToggleGroup` · `Text` · `TopStatus` · `LoadingText` · `Alert` · capability + depth tiles as app composition (`checkion-capability-grid`, `checkion-depth-grid`, `checkion-launch-compose`) · GEO query list (`GeoQueryList` / `checkion-geo-query-list`) · GEO model picker (`GeoModelPicker` / `checkion-geo-model-picker`) · progressive `checkion-launch-reveal` / `checkion-rise` motion.

### GEO query list + Suggest
- Default rows: brand-derived prompts (`defaultGeoQueries(url, { companyName })`). Changing URL / company refreshes defaults only when the list still matches the previous brand defaults.
- **Suggest** → `POST /api/geo/suggest-queries` `{ url?, companyName?, project?: { name, domain }, existing?, max? }` → dialog to Add / Add all. At least one of `url` / `companyName` required.
- **Fixture behavior** (no `OPENAI_API_KEY`, CI / local dummy): returns host/brand-derived pool beyond the three launch defaults; response `source: "fixture"`, `stubbed: true`.
- **Live Suggest** (`OPENAI_API_KEY` set): OpenAI prompt suggestions (`source: "openai"`); falls back to fixture pool on failure.
- Submit still posts `queries: string[]` to `POST /api/geo-jobs` (empty list falls back to brand defaults client-side).

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
- Create: `POST /api/geo-jobs` with `{ url?, companyName?, queries[], projectId?, models?, competitors?, title? }`. At least one of `url` / `companyName` required; when only `companyName`, server derives a normalized citation URL. `projectId` is optional — when omitted / empty, API **auto-creates** a Collection project from URL / company (session/`PLEXON_DEMO_COMPANY_ID`); when provided, must exist. Form does not pre-select or silently substitute another project. **`companyId` is not a GEO-job field** — company name is a brand hint, not a federation id. Live requires `OPENAI_API_KEY`.
- Suggest (launch only): `POST /api/geo/suggest-queries` with `{ url?, companyName?, project?, existing?, max? }` — see GEO query list above.

## Cross-product (AUDION)
AUDION may optionally trigger **`mode: single`** for a step URL (Chat-Inspect / Studies) via `POST /api/scans` or `/scan?projectId&mode=single&url=` — see `audion-journey-scan-trigger.md`. That path must **not** use `deep`, domain crawl, `geo`, or `seo`.

AUDION research may call **`POST /api/fetch-page`** for Chromium page text when HTTP crawl is blocked — see `specs/api/fetch-page.md` (not a WCAG scan).

## Deferred
Dedicated SEO-only crawl (without full domain magazine), Journey agent live, performance-as-primary tab, reuse-cache polish, competitor cron, normalized `scan_issues` tables, multi-provider GEO cron.
