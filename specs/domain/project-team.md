# Project team (CHECKION)

**Status:** Accepted — 2026-09-19  
**Parent:** `access-model-b-visibility.md` · Plexon `collection-members.md` / `collection-invite-links.md`  
**Parity:** Audion project Team panel (`knowledge/collection-team-plexon.md`)

## Goal

Under a Collection-bound CHECKION project, show who has Access Model B access and allow:

1. Add by email (same-company Plexon user → additive assignment)
2. Mint invite link (Plexon Collection invite)

SSOT is Plexon — not a local CHECKION members table.

## UI

- Project workspace intro: pulse left, Team aside right (`ProjectTeamPanel`).
- Unbound / `plx-local-*`: empty state “sync Collection”.

## BFF

| Method | Path |
|--------|------|
| GET/POST | `/api/projects/:id/members` |
| DELETE | `/api/projects/:id/members/:userId` |
| POST | `/api/projects/:id/invites` |

Auth: session; project must pass `viewerCanAccessProject`.
