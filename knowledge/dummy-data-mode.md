# Dummy / fixture mode — CHECKION v3

## Policy (now)
Work **only** with local fixtures. No live crawler, no Plexon sync, no shared DB.
Focus: project create, single/domain scans, GEO and related product surfaces.

| Flag | Value |
|------|-------|
| `paths.dataSource` | `fixtures` |
| `paths.federationMode` | `dummy` |
| Plexon federation | **deferred** |

## Corpus
- 3 projects (Bosch, Docs, Shop)
- Multiple single + deep scans with rich issue lists
- 2 domain crawls
- 2 GEO magazine jobs (`geo-1` Dürr competitive, `geo-2` shop PDP) with placement + query runs
- Sample share tokens (`sh_demo_single_1`, `sh_demo_domain_1`, `sh_demo_shop_cart`)
- Launch synthesizes a **completed** scan immediately (`synthesizeCompletedScan`)

## Later
Re-enable Plexon federation (`specs/domain/plexon-federation.md`) after local product flows are solid — keep fixtures as fallback.

### GEO live LLM launch later
No job-create / worker path yet — GEO results are fixture-only (`lib/fixtures/geo-jobs.ts` → `finalize()` derives presence + insights). When live launch lands: accept target URL, queries, models, optional competitors → enqueue LLM queryRuns → same derive helpers. Until then, do not invent a Plexon federation pipeline in this island.
