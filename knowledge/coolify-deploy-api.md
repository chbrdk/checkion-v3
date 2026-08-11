# Coolify deploy — checkion-v3

Stand: 2026-08-11

Coolify MCP (`user-coolify`) is **read-only**. Deploys go through the Coolify REST API. Canonical table: `plexon-v3/knowledge/coolify-deploy-api.md`.

| Item | Value |
|------|--------|
| API base | `https://coolify.plygrnd.tech/api/v1` |
| Auth | Bearer token (Cursor MCP Coolify header — never commit) |
| App UUID | `valb5m9m099d9k7i2d1xkv6p` (`checkion-v3:main-app`) |
| FQDN | https://checkion-v3.projects-a.plygrnd.tech |
| Deploy | `POST /deploy` body `{ "uuid": "valb5m9m099d9k7i2d1xkv6p", "force": true }` |
| Status | `GET /deployments/{deployment_uuid}` |

## Flow

1. Commit + push `main` on `chbrdk/checkion-v3`
2. Force-deploy via API (above)
3. Poll deployment until finished; smoke `https://checkion-v3.projects-a.plygrnd.tech`

## 2026-08-11 — GEO honesty + Re-run

- Commit: `76ee963`
- Deployment uuid: `y14b7lr5yjnffp277g2b5n8b` (queued after push)
