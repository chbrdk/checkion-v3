# Settings — CHECKION v3

## Status
Accepted (Wave 4 / Phase 4 Collection surface)

## Goal
Quiet settings page: federation status, display prefs, personal API tokens (create once / revoke). No MUI settings drawer.

## Bands
1. **Federation** — contract id, plexon base, health probe link
2. **Appearance** — theme + locale via `paths` keys (client prefs)
3. **Tokens** — personal API token CRUD (`specs/domain/settings-api-tokens.md`)

## Auth
Login `/login` — plexon-v3 credentials when `PLEXON_AUTH_URL` + secret set; local open mode otherwise.
