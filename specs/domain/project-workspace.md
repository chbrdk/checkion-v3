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
- Tile anatomy: **kicker** (domain) · **headline** (name) · optional **hint** · capability **badge** · **stats** (scans · last scan) · **ghost actions** (Open · Edit · Archive)
- **Stats** `scanCount` / `lastScanAt` are computed on read: standalone singles + deep domain jobs + GEO jobs (deep page-scan rows are not double-counted)
- List anatomy: numbered row · name + domain · capability badge · scans / last scan · ghost actions; create as first list control
- Magazine band: search + capability filters (All · In sync · Pending · Error) + view toggle — not a Panel table
- Create via dashed create card (tiles) or list “New project” control → `Dialog`: name, domain, description
- Deep-link: `/projects?platformProjectId=` → detail when bound; otherwise opens create with that collection id

## Workspace (`/projects/:id`)
One editorial magazine composition (Audion project magazine / GEO cover / launch hero language) — **rebuild, not Panel skin**:

- No AppShell `checkion-page-lead` (domain lives on the cover host line)
- Comfortable **top padding** under the rail (same breath as projects hub / home)

1. **Topbar** — breadcrumb `Projects / {name}` · primary CTAs (New scan · Open GEO / Start GEO)
2. **Cover** — project name as hero brand signal · domain as host · lede · facets (capability sync · collection id · last activity) · ghost Edit · Archive
3. **Corpus pulse** — magazine chapter band (single / deep scan / GEO counts · latest score) as hairline editorial meters — not a dense boxed dashboard
4. **Latest runs** — three equal columns (same composition as home `checkion-home-run-columns`):
   - **Singles** → `/results/:id/overview`
   - **Deep scans** → `/domain/:id/overview`
   - **GEO runs** — always show the column; EmptyState when empty → `/geo/:id/overview`

Federation fields (`platformProjectId`, `capabilityStatus`) stay visible on the cover. No multi-tab hub.

## Archive semantics
UI **Archive** (not Delete) calls `POST /api/projects/:id/archive` → Plexon `PATCH …/provisioning/projects/:platformProjectId` `{ status: archived }` when bound, then local mirror `status: archived` (hidden from default lists). Unbound / dummy: local archive only. Scans stay on the project. Hard-delete remains Plexon global-admin / ops only.
