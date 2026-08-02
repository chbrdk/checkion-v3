# API tokens (Settings)

**Status:** Accepted — Phase 4 (Plexon Collection surface)  
**UI:** `/settings` tokens band  
**Knowledge:** `knowledge/paths.md`, `knowledge/settings-api-tokens.md`  
**Reference:** CHECKION v2 `lib/auth-api-token` · audion-v3 settings API tokens

## Purpose

Personal Bearer tokens for MCP / CLI / scripted BFF access. Fixture-backed when `DATABASE_URL` unset; Postgres `api_tokens` when configured.

## Model

| Field | Notes |
|-------|--------|
| `id` | Opaque id (`tok-…`) |
| `label` | Display label |
| `prefix` | Visible prefix only (`checkion_` + 4 hex) |
| `ownerId` | Session user id / email, else `paths.apiTokenFixtureOwnerId` |
| `tokenHash` | SHA-256 hex of raw token (never returned after create) |
| `createdAt` / `lastUsedAt` | ISO timestamps |

**Raw token format:** `paths.apiTokenPrefix` (`checkion_`) + 64 hex (32 random bytes). Shown **once** on create.

## Auth resolution

`getRequestUser(request)` — Bearer first, then session. Wired on:

- `POST /api/projects` (owner fallback)
- `POST /api/scans` (required when Plexon auth configured)
- `POST /api/geo-jobs` (required when Plexon auth configured)

Middleware allows `/api/*` when `Authorization: Bearer …` is present (in-route validation).

## Non-goals

- Scopes / expiry / rotation UI
- Service tokens (Plexon inbound uses `PLEXON_SERVICE_SECRET`)
- Journey / Reports / MCP product surface

## Acceptance

1. Create returns raw token once; list never includes it.
2. Revoke removes row; resolve / verify fails after revoke.
3. Paths only via `paths.ts`.
4. Fixture roundtrip tests green.
