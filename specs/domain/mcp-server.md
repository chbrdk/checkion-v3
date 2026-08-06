# CHECKION v3 MCP Server

**Status:** Accepted — 2026-08-05  
**Implements:** `mcp-server/` (Streamable HTTP + stdio)  
**Knowledge:** `knowledge/mcp-server.md` · `knowledge/paths.md`  
**Auth:** Bearer API token from Settings (`specs/domain/settings-api-tokens.md`)

## Purpose

Expose checkion-v3 BFF APIs as MCP tools for Cursor / Claude / Coolify. Separate deployable from the web app (same pattern as CHECKION v2 `mcp-server/`).

## Transport

| Mode | Env | Use |
|------|-----|-----|
| Streamable HTTP (default) | `MCP_PORT` (3100), optional `MCP_STATELESS=1` | Cursor / Coolify / proxy |
| stdio | `MCP_TRANSPORT=stdio` | Claude Desktop subprocess |

## Env

| Key | Required | Notes |
|-----|----------|-------|
| `CHECKION_API_URL` | Yes | Base URL of checkion-v3 (e.g. `https://checkion-v3.projects-a.plygrnd.tech`) |
| `CHECKION_API_TOKEN` | Yes | `checkion_` + 64 hex from Settings → API tokens |
| `MCP_TRANSPORT` | No | `stdio` or omit/`http` |
| `MCP_PORT` | No | Default `3100` |
| `MCP_STATELESS` | No | `1` when behind a reverse proxy that drops session headers |

## Tool surface (v3 only)

Prefix: `checkion_v3.` (distinct from v2 `checkion.*` if both MCPs are installed).

| Area | Tools |
|------|--------|
| Health | `health` |
| Projects | `projects_list`, `project_get`, `project_create`, `project_update`, `project_delete` |
| Single / deep scans | `scans_list`, `scan_start`, `scan_get`, `scan_overview`, `scan_issues`, `scan_scores`, `scan_screenshot`, `scan_delete`, `scan_weakest_signal` |
| Deep scans | `domain_scans_list`, `domain_scan_start`, `domain_scan_get`, `domain_scan_overview`, `domain_scan_issues`, `domain_scan_control`, `domain_scan_seo_reading`, `domain_scan_trust_reading`, `project_active_domain_scans` |
| GEO | `geo_jobs_list`, `geo_job_start`, `geo_job_get`, `geo_suggest_queries`, `geo_job_reading`, `geo_job_publish_knowledge` |
| Share | `share_create`, `share_get` |
| Research | `fetch_page` |

## Non-goals (deferred)

Journey agent, saliency, standalone tools (contrast/SSL/PSI), v2 path aliases (`/api/scan`, `/api/scan/domain`).

## Acceptance

1. `npm run build` in `mcp-server/` succeeds.  
2. With local web + token, `checkion_v3.health` returns ok.  
3. Spec + paths documented; Coolify Dockerfile under `mcp-server/Dockerfile`.
