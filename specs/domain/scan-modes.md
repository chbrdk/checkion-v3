# Scan modes — CHECKION v3

## Status
Accepted (Phase 2 — live single + domain pipelines; Phase 3 — GEO launch on `/scan`)

## MVP modes
| Mode | Route | Result |
|------|-------|--------|
| `single` | `/scan` | `/results/[id]/{overview\|issues\|detail}` |
| `deep` | `/scan` | Same + `/domain/[id]/…` for light domain payload |
| `geo` | `/scan` | `/geo/[id]/overview` via `POST /api/geo-jobs` |

`geo` is a **launch mode** on the central form, not a `ScanMode` on accessibility scan rows. Product semantics stay in `geo-competitive-presence.md`.

## Launch UX (central magazine)
One composition on `/scan` (`ScanLaunchForm` / `checkion-magazine--launch`):

1. **Mode picker** (primary) — `ToggleGroup`: Single · Deep · GEO (AUDION handoff locks to Single)
2. **URL** — page or host to evaluate / cite against
3. **Project** — CHECKION Collection capability
4. **GEO extras** (when mode = `geo`) — queries (one per line; sensible defaults from host) · optional models (default `OPENAI_MODEL` / `gpt-5.4-nano`)
5. **CTA** — launches the selected path; secondary demo jumps stay quiet (fixture result links)

Primitives: `Panel` · `SectionChrome` · `ToggleGroup` · `Field` / `Input` / `Textarea` / `Select` / `Button` · `Text` · `TopStatus` · `LoadingText` · `Alert` · light `checkion-rise` motion.

Deep-links (`paths.routes.scanLaunch`):
- `projectId`, `mode=single|deep|geo`, `url`
- AUDION correlation: `platformProjectId`, `audionRunId`, `stepUrl` (forces single; never deep/GEO)

## Live vs fixture
### Scans (`single` / `deep`)
- Gate: `lib/scan/live-scan-gate.ts` — live when `DATABASE_URL` **or** `CHECKION_LIVE_SCANS=1`; `CHECKION_LIVE_SCANS=0` forces synthesize.
- Live path: queued row → Puppeteer/Pa11y/axe (`lib/scan/scanner.ts`) or spider (`lib/scan/spider.ts`) → adapt → jsonb on `scans` / `domain_scans`.
- `POST /api/domain-scans` starts domain crawls; deep `POST /api/scans` delegates to the same start helper.
- Fixture synthesize remains for local demos and CI (no Chromium).

### GEO (`geo`)
- Gate: `lib/geo-eeat/live-geo-gate.ts` — live when `DATABASE_URL` **or** `CHECKION_LIVE_GEO=1`; `CHECKION_LIVE_GEO=0` forces synthesize.
- Live requires `OPENAI_API_KEY`; fixture path synthesizes a completed magazine overview instantly.
- Create: `POST /api/geo-jobs` with `{ projectId, url, queries[], models?, competitors?, title? }`.

## Cross-product (AUDION)
AUDION may optionally trigger **`mode: single`** for a step URL (Chat-Inspect / Studies) via `POST /api/scans` or `/scan?projectId&mode=single&url=` — see `audion-journey-scan-trigger.md`. That path must **not** use `deep`, domain crawl, or `geo`.

## Deferred
Journey agent live, performance-as-primary tab, reuse-cache polish, competitor cron, normalized `scan_issues` tables, multi-provider GEO cron.
