# Settings API tokens — Phase 4

Personal Bearer tokens under Settings. Fixture store or Postgres `api_tokens`.

## Specs

- Domain: `specs/domain/settings-api-tokens.md`
- API: `specs/api/tokens.md`

## Surface

| Piece | Path |
|-------|------|
| UI | `/settings` · `SettingsPage` tokens band (`SettingsTokens`) |
| Store | `apps/web/lib/fixtures/api-tokens-store.ts` |
| DB | `apps/web/lib/db/api-tokens.ts` · schema `api_tokens` |
| Lib | `apps/web/lib/api-tokens.ts` · `apps/web/lib/auth-api-token.ts` |
| APIs | `GET/POST /api/tokens` · `DELETE …/tokens/[id]` · `POST …/tokens/verify` |

## Format

- Raw: `paths.apiTokenPrefix` (`checkion_`) + 64 hex
- Stored: SHA-256 hash only
- Owner: session user id/email, else `paths.apiTokenFixtureOwnerId` (`local-admin`)

## Machine clients

```bash
# Create (session cookie when Plexon auth on; open locally)
curl -X POST "$CHECKION/api/tokens" -H 'Content-Type: application/json' -d '{"label":"CLI"}'

# Verify
curl -X POST "$CHECKION/api/tokens/verify" -H "Authorization: Bearer checkion_<64hex>"

# Launch scan with Bearer (when Plexon auth configured)
curl -X POST "$CHECKION/api/scans" \
  -H "Authorization: Bearer checkion_<64hex>" \
  -H 'Content-Type: application/json' \
  -d '{"projectId":"…","mode":"single","url":"https://example.com/"}'
```

## Smoke

```bash
npm run test -w web -- __tests__/api-tokens.test.ts __tests__/platform-provisioning.test.ts
```
