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
- Ledger table: name · domain · capability · scan count · last scan
- Search + capability filter + **New project**
- Row actions: Open · Edit · Delete (`ConfirmDialog` danger)
- Create/Edit via `Dialog`: name, domain, description
- Deep-link: `/projects?platformProjectId=` → detail when bound; otherwise opens create with that collection id

## Workspace (`/projects/:id`)
Cover + activity + recent single scans table + domain crawls table.
Actions: New scan (`/scan?projectId=`), Edit, Delete.
No multi-tab hub (GEO / reports deferred).

## Delete semantics
Project removed; scans and domain crawls reassigned to `proj-unassigned` so results stay reachable.
