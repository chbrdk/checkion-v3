# Project workspace — CHECKION v3

## Status
Accepted (Phase 1 + local CRUD)

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
Cover + activity + recent single scans table + domain crawls table.
Actions: New scan (`/scan?projectId=`), Edit, Delete.
No multi-tab hub (GEO / reports deferred).

## Delete semantics
Project removed; scans and domain crawls reassigned to `proj-unassigned` so results stay reachable.
