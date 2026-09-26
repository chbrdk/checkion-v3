# Share links — CHECKION v3

## Status
Accepted (Wave 4 / minimal)

## Goal
Public read-only link to a completed scan result overview. No password, no journey/GEO shares in MVP.

## Model
| Field | Notes |
|-------|--------|
| `token` | Opaque public id |
| `resourceType` | `single` \| `domain` |
| `resourceId` | Scan or domain-scan id |
| `createdAt` | ISO |

## Routes
| Surface | Path |
|---------|------|
| Create / lookup | `POST /api/share`, `GET /api/share?resourceType=&resourceId=` |
| Public resolve | `GET /api/share/[token]` |
| Landing | `/share/[token]` → magazine overview (no app chrome rail required; quiet brand) |
| Revoke | `DELETE /api/share/[token]` |

## UI
Result toolbar: Share (`Dialog` copy link), Re-run (`ConfirmDialog`), Delete (`ConfirmDialog` danger).

## Deferred
Password, expiry, journey shares, video/screenshot access tokens (v2 parity later).

## Suite Share-Links Hub
Create/revoke projects into Plexon Collection Share Links (`scan_overview`) when the scan’s project is Collection-bound and an actor session is present. Spec: `plexon-v3/specs/domain/collection-share-links.md` · client `lib/plexon-share-links.ts`.

**Hub revoke fan-out:** Plexon `DELETE …/share-links/:token?productId=checkion` calls
`DELETE /api/platform/provisioning/collections/:platformProjectId/share-links/:token`
(service secret + contract). Does not re-project to Plexon.
