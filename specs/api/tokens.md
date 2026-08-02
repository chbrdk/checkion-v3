# API tokens

**Status:** Accepted — Phase 4  
**Paths:** `paths.routes.apiTokens*` · `knowledge/paths.md` · `knowledge/settings-api-tokens.md`

## Endpoints

| Method | Path | Role |
|--------|------|------|
| `GET` | `/api/tokens` | List current owner stubs (no secrets). Session when middleware gates. |
| `POST` | `/api/tokens` | Create; body `{ label?: string }`; returns raw `token` once |
| `DELETE` | `/api/tokens/[tokenId]` | Revoke; `{ ok: true }` |
| `POST` | `/api/tokens/verify` | Smoke: Bearer → `{ ok, ownerId, tokenId }` or 401 |

## List response

```ts
{ items: ApiTokenStub[] } // id, label, prefix, createdAt, lastUsedAt
```

## Create response

```ts
ApiTokenStub & { token: string }
```

## Owner

- Prefer session `user.id` / email when `auth()` present
- Else fixture owner `local-admin` (`paths.apiTokenFixtureOwnerId`)

## Persistence

- No `DATABASE_URL`: in-memory `api-tokens-store`
- With `DATABASE_URL`: Drizzle `api_tokens` (`owner_id`, `token_hash`, …)

## Errors

| Status | When |
|--------|------|
| 401 | Verify with missing/invalid Bearer |
| 404 | Revoke unknown id / wrong owner |

## Acceptance

1. Paths from `paths.routes` only.
2. Hash never appears in JSON list/create (aside from one-time raw `token` on create).
3. Verify succeeds only for unrevoked raw token.
