# CHECKION v3 MCP Server

Spec: `specs/domain/mcp-server.md`. Package: `mcp-server/`.

## Local

```bash
cd mcp-server
npm install
export CHECKION_API_URL=http://localhost:3007
export CHECKION_API_TOKEN=checkion_…   # Settings → API tokens
npm run dev                            # HTTP :3100
# or: MCP_TRANSPORT=stdio npm run start:stdio
```

## Cursor (HTTP)

Add MCP server URL `http://localhost:3100` (or staging Coolify MCP URL) with Streamable HTTP. Prefer `MCP_STATELESS=1` behind proxies.

## Coolify

- App: `checkion-v3-mcp` in `msqdx-ecosystem-v3` / staging (not prod CHECKION MCP).
- Dockerfile: `mcp-server/Dockerfile`, context `mcp-server`.
- Port **3100**.
- Env: `CHECKION_API_URL=https://checkion-v3.projects-a.plygrnd.tech`, `CHECKION_API_TOKEN=…`, `MCP_STATELESS=1`.

## Staging URL placeholder

`URL_CHECKION_V3_MCP` — set after Coolify attach (document in `knowledge/paths.md`).
