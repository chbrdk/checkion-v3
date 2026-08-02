# Plexon federation — CHECKION v3

## Status
**Deferred** — local fixture development first (projects, scans, domain, GEO). Live sync later.

## Contract
`2026-05-plexon-federation-v3` against **plexon-v3 only** (parked implementation exists).

## Parked directions
| Direction | Endpoint | Notes |
|-----------|----------|-------|
| Plexon → CHECKION | `PUT/GET /api/platform/provisioning/projects/{id}` | Code present; unused in local dummy flow |
| CHECKION → Plexon | `checkion-project-origin` client + plexon-v3 route | Not called from `POST /api/projects` while deferred |

## Mode (now)
- `paths.federationMode = dummy` — local CRUD only
- Do **not** set `CHECKION_FEDERATION_MODE=live` until product surfaces (scan / domain / GEO) are ready

## Later (when un-deferred)
- Wire outbound origin on project create again
- Health/settings live probe
- Capability status from real sync
- Env: see `knowledge/paths.md`
