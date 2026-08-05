# CHECKION v3

Spec-driven island rebuild of CHECKION on `@msqdx/ui`, parallel to prod CHECKION (v2).

## Layout

- `apps/web` — Next.js app (magazine shell + projects + scan results)
- `packages/contracts` — shared domain types
- `mcp-server/` — MCP tools for Cursor/Claude (`checkion_v3.*`) → checkion-v3 APIs
- `specs/` — domain + API contracts (source of truth)
- `knowledge/` — paths, migration maps, slice pattern

## Quick start

```bash
npm install
npm run dev -w web
```

Default local port: **3007**.

## MVP scope

App shell · Projects (collection capability) · Single/Deep scan launch · Result magazine (overview / issues / scores).

Deferred: Journey Agent live, Project Report, Rank tracking.
