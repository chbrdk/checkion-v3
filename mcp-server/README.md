# CHECKION v3 MCP Server

MCP server for **checkion-v3** APIs (not CHECKION v2). Spec: `../specs/domain/mcp-server.md`.

## Env

| Variable | Required | Description |
|----------|----------|-------------|
| `CHECKION_API_URL` | Yes | checkion-v3 base (e.g. `https://checkion-v3.projects-a.plygrnd.tech`) |
| `CHECKION_API_TOKEN` | Yes | Bearer token from Settings → API tokens |
| `MCP_TRANSPORT` | No | `stdio` or omit/`http` |
| `MCP_PORT` | No | Default `3100` |
| `MCP_STATELESS` | No | `1` behind proxies (Coolify default in Dockerfile) |

## Local

```bash
npm install
export CHECKION_API_URL=http://localhost:3007
export CHECKION_API_TOKEN=checkion_…
npm run dev
```

Tools use prefix `checkion_v3.*` so they do not collide with the v2 MCP (`checkion.*`).

## Cursor (stdio)

```json
{
  "mcpServers": {
    "checkion-v3": {
      "command": "npx",
      "args": ["tsx", "/ABSOLUTE/PATH/checkion-v3/mcp-server/src/index.ts"],
      "env": {
        "MCP_TRANSPORT": "stdio",
        "CHECKION_API_URL": "https://checkion-v3.projects-a.plygrnd.tech",
        "CHECKION_API_TOKEN": "checkion_…"
      }
    }
  }
}
```

## Coolify

Separate app `checkion-v3-mcp` — Dockerfile `mcp-server/Dockerfile`, context `mcp-server`, port **3100**. See `../knowledge/mcp-server.md`.
