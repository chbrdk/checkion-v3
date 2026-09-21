# Project team (CHECKION)

**Status:** Accepted — 2026-09-19  
**Parent:** `access-model-b-visibility.md` · Plexon `collection-members.md` / `collection-invite-links.md`  
**Parity:** Audion project Team panel (`knowledge/collection-team-plexon.md`)

## Goal

Under a Collection-bound CHECKION project, show who has Access Model B access and allow:

1. Add by email (same-company Plexon user → additive assignment)
2. Mint invite link (Plexon Collection invite); when the draft email is filled, POST includes `toEmail` so Plexon sends `collection_invite` mail (clipboard-only when draft empty)

SSOT is Plexon — not a local CHECKION members table. Outbound mail is Plexon-only (`plexon-v3/specs/domain/transactional-email.md`).

## UI

- Project workspace intro: pulse left, Team aside right (`ProjectTeamPanel`).
- Composition matches Audion `CompactEditableList` / Checkion GEO query list: numbered magazine rows, **inline draft email** on “Add member” (no always-visible Field), Invite link as secondary foot action.
- Unbound / `plx-local-*`: empty state “sync Collection”.

## BFF

| Method | Path |
|--------|------|
| GET/POST | `/api/projects/:id/members` |
| DELETE | `/api/projects/:id/members/:userId` |
| POST | `/api/projects/:id/invites` |

Auth: session; project must pass `viewerCanAccessProject`.
