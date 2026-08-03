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

- Hairline **collection grid**: create tile first, then project tiles
- Tile anatomy: **kicker** (domain) · **headline** (name) · optional **hint** · capability **badge** · **stats** (scans · last scan) · **ghost actions** (Open · Edit · Delete)
- Magazine band: search + capability filters (All · In sync · Pending · Error) — not a Panel table
- Create via dashed create card → `Dialog`: name, domain, description
- Deep-link: `/projects?platformProjectId=` → detail when bound; otherwise opens create with that collection id

## Workspace (`/projects/:id`)
One editorial magazine composition (Audion project magazine / GEO cover / launch hero language) — **rebuild, not Panel skin**:

1. **Topbar** — breadcrumb `Projects / {name}` · ghost Edit · Delete
2. **Cover** — project name as hero brand signal · domain as host · lede · facets (capability sync · collection id · last activity) · primary CTAs (New scan · Open GEO / Start GEO)
3. **Corpus pulse** — magazine chapter band (single / domain / GEO counts · latest score · last scan) as hairline editorial meters — not a dense boxed dashboard
4. **Chapters** — numbered magazine lists (not Panel tables):
   - Single scans → `/results/:id/overview`
   - Domain crawls → `/domain/:id/overview`
   - GEO runs → `/geo/:id/overview` (when present for this project)

Federation fields (`platformProjectId`, `capabilityStatus`) stay visible on the cover. No multi-tab hub.

## Delete semantics
Project removed; scans and domain crawls reassigned to `proj-unassigned` so results stay reachable.
