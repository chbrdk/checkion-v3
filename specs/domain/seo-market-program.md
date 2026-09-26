# SEO Market program — CHECKION v3

## Status
Accepted (Phase 0 specs · Phase 1 hub stub · **Phase 2 project workspace** — OpenSEO IA)

## Purpose
Expand CHECKION **SEO** beyond on-page Quality crawls into **Market SEO** workflows previously associated with OpenSEO (keywords, SERP, rank tracking, competitors, backlinks, domain organic overview, optional GSC) — **inside Checkion**, self-hosted, without OpenSEO runtime / MCP.

Primary UX: **project-scoped workspace** — [`seo-project-workspace.md`](./seo-project-workspace.md).

## Layers (one capability tile)

| Layer | Source | Surfaces |
|-------|--------|----------|
| **Quality** | Existing Puppeteer domain crawl | `/domain/:id/…`, `seoCoverage`, Issues — no ranking claims |
| Market | DataForSEO (+ optional GSC) | `/projects/:id/seo/*` — persisted keywords, rank configs, backlink history |

GEO remains a separate capability (answer-engine presence). Do **not** merge OpenSEO “AI Visibility” into GEO jobs. If DataForSEO LLM/SERP visibility lands later, ship it as a Market band labeled **Search / LLM SERP**, never as GEO.

## Non-goals
- Fork or deploy OpenSEO as a Coolify dependency
- OpenSEO hosted MCP or UI
- Inventing Semrush-class crawl indexes in-house
- Ranking health-score % without evidence (suite rule)

## Vendor
**DataForSEO** is the sole market-data vendor. Key: `DATAFORSEO_API_KEY` (server-only). Live gate: [`seo-dataforseo.md`](./seo-dataforseo.md).

OpenSEO (MIT) may be used as **read-only reference** for endpoint shapes and workflow cut — never as a runtime import.

## Scoping
All Market rows are Collection-scoped via CHECKION `projectId` (Access Model B). Soft cost caps warn before expensive calls (bulk SERP, backlinks).

## Related
- Workspace IA: [`seo-project-workspace.md`](./seo-project-workspace.md) (supersedes thin `/seo` hub)
- Vendor gate: [`seo-dataforseo.md`](./seo-dataforseo.md)
- Launch: [`scan-modes.md`](./scan-modes.md)
- Quality crawl: [`domain-scan-sections.md`](./domain-scan-sections.md)
- MCP: [`mcp-server.md`](./mcp-server.md)
- API: [`../api/seo-project.md`](../api/seo-project.md)
