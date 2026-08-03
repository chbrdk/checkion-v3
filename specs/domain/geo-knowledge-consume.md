# GEO ↔ Collection Knowledge Pack — consume & publish

**Status:** Accepted — implemented — 2026-08-03  
**Plexon SoT:** `plexon-v3/specs/domain/collection-knowledge-pack.md`  
**API:** `plexon-v3/specs/api/collection-knowledge-pack.md`  
**Sync:** `plexon-v3/knowledge/collection-knowledge-sync.md`  
**Local GEO:** `specs/domain/geo-competitive-presence.md` · `specs/api/geo-suggest-queries.md` · `specs/domain/scan-modes.md`  
**Federation:** `specs/domain/plexon-federation.md`

## Purpose

CHECKION GEO jobs remain the **capability-local** system of record for query×model runs, citations, and presence metrics. The Collection Knowledge Pack holds **shared** findability context (`geo_context`) and shared rivals (`competitive`) so Suggest/Create and Audion research can pull a durable brief — without stuffing GEO payloads into Plexon or bloating thin project upsert.

## Non-goals

- Uploading `queryRuns`, full answers, or issue lists into the pack
- Making Tenant-Company the default knowledge bucket for client GEO
- Changing `PlatformProjectUpsertPayload`

## Consume (pull-on-use)

When the GEO launch form has a **Collection** selected (`platformProjectId` / bound `projectId`):

| Action | Pack use |
|--------|----------|
| **Suggest** (`POST /api/geo/suggest-queries`) | Server (or BFF) may `GET` pack facets `profile`, `competitive`, `research_brief`, `geo_context` and enrich the suggest body beyond today’s `{ name, domain }` project stub |
| **Create** (`POST /api/geo-jobs`) | Prefill `competitors` from `competitive.competitors[].host` ∪ `geo_context.knownCompetitors`; optional seed query list from `geo_context.seedQueries` when launch list empty |
| No Collection | Current behaviour (URL / companyName only) |

Extend suggest API body (additive, non-breaking):

```json
{
  "url": "…",
  "companyName": "…",
  "project": { "name": "…", "domain": "…" },
  "platformProjectId": "…",
  "knowledge": {
    "profile": { "displayName": "…", "industry": "…" },
    "competitive": { "category": "…", "hosts": ["…"] },
    "researchBrief": { "summary": "…", "topics": ["…"] },
    "geoContext": { "queryThemes": ["…"], "seedQueries": ["…"] }
  },
  "existing": [],
  "max": 4
}
```

Client may pass `knowledge` after fetching the pack, **or** server resolves `platformProjectId` via service GET to plexon-v3 when `CHECKION_FEDERATION_MODE=live`. Prefer server resolve in live mode to avoid stale client copies.

## Publish (autosync)

After a **completed** GEO job with Collection binding and `CHECKION_FEDERATION_MODE=live`, Checkion **autosyncs** findability context to the pack. Soft-skip when unbound, dummy mode, or pack unreachable.

Manual **Re-sync** CTA remains on the GEO overview. Kill-switch: `KNOWLEDGE_PACK_AUTOSYNC=0`.

Publishes:

| Facet | Payload |
|-------|---------|
| `geo_context` | `queryThemes` (clustered), `seedQueries` (capped), `knownCompetitors`, `targetHosts`, `lastGeoJobId` |
| `competitive` | `mode: merge` — union explicit + high-signal discovered rivals (not full citation long-tail) |

Provenance: `productId: checkion`, `runId: <geoJobId>`.

Never publish raw `queryRuns`.

## Mapping to existing atoms

| GEO atom | Pack |
|----------|------|
| Explicit `competitors` | → `competitive` / `geo_context.knownCompetitors` |
| Discovered rivals (Top field) | → merge candidates (user confirm) |
| Launch queries | → `geo_context.seedQueries` subset |
| Presence metrics / SoV | **stay job-local** (magazine overview) |

## Ownership labels (UI)

- GEO magazine result: **Capability-local**
- Publish CTA: writes **Shared** Collection knowledge
- Suggest enrichment from pack: show quiet “Using Collection knowledge” when facets non-empty

## Phasing

| Phase | Notes |
|-------|-------|
| Implemented | autosync on GEO complete (live) + Re-sync CTA + suggest pull |

## Paths

When implementing: Plexon knowledge URLs via `runtime-config` / `paths.ts`; document in `knowledge/paths.md`. Contract remains `2026-05-plexon-federation-v3`.
