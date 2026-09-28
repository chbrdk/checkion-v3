# Project workspace — CHECKION v3

## Status
Accepted (Phase 1 + local CRUD · magazine workspace rebuild)

## Model
A CHECKION project is the **local capability record** for the same Collection as in Plexon:

| Identity | Field | Role |
|----------|-------|------|
| CHECKION | `id` | Primary key in routes / scan `projectId` |
| Plexon | `platformProjectId` | Collection binding / deep-link |

Dummy mode owns full CRUD in the fixture store. Plexon live federation is deferred.

## Administration (`/projects`)
Magazine collection hub (same composition as plexon-v3 Collection cards — rebuild, not ledger skin):

- Comfortable **top padding** under the rail (same breath as home / launch covers)
- Hairline **collection grid** (default) **or** numbered **magazine list** — view toggle in the band (Tiles · List)
- Tile anatomy: **kicker** (domain) · **headline** (name) · optional **hint** · capability **badge** · **stats** (Singles / Deep / GEO / SEO — **counts only**, no dates) · **ghost action** (**Open** only — Edit / Archive live on the project workspace cover)
- **Stats** are computed on read via `project-activity` (DB: light column selects in `dbLoadProjectActivityInput`; fixtures: scan/domain/geo lists). Never trust stale denormalized `scanCount` / `lastScanAt` alone on the hub. SEO lane counts rank configs.
- List anatomy: numbered row · name + domain · capability badge · activity lane summary · **Open** only; create as first list control
- Magazine band: search + capability filters (All · In sync · Pending · Error) + view toggle — not a Panel table
- Create via dashed create card (tiles) or list “New project” control → `Dialog`: name, domain, description
- Deep-link: `/projects?platformProjectId=` → detail when bound; otherwise opens create with that collection id

## Workspace (`/projects/:id`)
One editorial magazine composition (Audion project magazine / GEO cover / launch hero language) — **rebuild, not Panel skin**:

- No AppShell `checkion-page-lead` (domain lives on the cover host line)
- Comfortable **top padding** under the rail (same breath as projects hub / home)

1. **Topbar** — breadcrumb `Projects / {name}` only (no primary CTAs — launch actions live in chapter footers / SEO · GEO chapter heads)
2. **Cover** — project name as hero brand signal · domain as host · lede · facets (capability sync · collection id · last activity) · right aside: compact ghost **Edit** · **Archive** (`size="sm"`) + **Team** panel. Client-room publish is **not** on the cover (suite freigabe stays on overview/share flows).
3. **Corpus pulse** — full-width magazine chapter band (single / deep scan / GEO counts · latest score) as hairline editorial meters — not a dense boxed dashboard
4. **Latest runs** — three equal columns (same composition as home `checkion-home-run-columns`):
   - **Singles** → `/results/:id/overview`
   - **Deep scans** → `/domain/:id/overview`
   - **GEO runs** — always show the column; EmptyState when empty → `/geo/:id/overview`
   - Same in-column paging as home: **6** visible, **Show more** (+6) up to **24** (`RUN_COLUMN_PAGE_SIZE` / `RUN_COLUMN_WINDOW`)
   - URL titles wrap/scale inside the column (same `checkion-project-run-list__title` rules as home)
   - Chapter footer CTAs (ghost `sm`, same language as SEO pulse **Open SEO**): **New single** · **New deep** · **Start GEO** → `scanLaunch` for each mode
5. **SEO pulse** — magazine teaser chapter (Corpus-pulse meter language): **Tracked** keywords · **Ref. domains** · **Organic KW** · **GSC clicks**. Built from `GET`/`getSeoProjectOverview` (no client fetch on the magazine). EmptyState + CTA → `/projects/:id/seo` when no Market data yet. **Not** the nested OpenSEO dashboard (no setup checklist / suggest agent / card grid).
6. **GEO History** — same magazine chapter chrome as Latest runs / SEO pulse (`checkion-project-chapter` + spread eyebrow/headline + ghost CTA). Per-query position timelines across completed GEO jobs (soft match by measurement + normalized query text). Model filter + `SeriesChart` cards. Deep-link `?chapter=geo-history`. Spec: [`geo-position-history.md`](./geo-position-history.md).
7. **SEO Market** — OpenSEO-style workspace at `/projects/:id/seo/*` (keywords, domain, backlinks, rank tracking, competitors, GSC). Spec: [`seo-project-workspace.md`](./seo-project-workspace.md).

Federation fields (`platformProjectId`, `capabilityStatus`) stay visible on the cover. No multi-tab hub (SEO deep work stays on the nested route tree; the magazine only teases via **SEO pulse**).

## Archive semantics
UI **Archive** (not Delete) calls `POST /api/projects/:id/archive` → Plexon `PATCH …/provisioning/projects/:platformProjectId` `{ status: archived }` when bound, then local mirror `status: archived` (hidden from default lists). Unbound / dummy: local archive only. Scans stay on the project. Hard-delete remains Plexon global-admin / ops only.
