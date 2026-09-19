# Access Model B — sibling audit (2026-09-19)

CHECKION closed the scan/domain/GEO list+detail leak; sibling apps were checked for the same class of bug and for `accessible-collections` truncation at 50.

## Findings

| App | Project lists | Dependent resources | Cursor loop |
|-----|---------------|---------------------|-------------|
| CHECKION | `listProjectsForViewer` | scans / domain / GEO gated (`resource-access`) | **yes** (this slice) |
| AUDION | `filterProjectsForViewer` | personas filtered; detail direct-URL gate still backlog | **yes** (this slice) |
| BRANDION | `listProjectsForViewer` | guidelines / analysis already `*ForViewer` | **yes** (this slice) |
| CREATION | `listProjectsForViewer` + scene ACL | scenes fail-closed via `require-scene-collection-access` | **yes** (project-access + `list-accessible-collections`) |
| METRON | `listProjectsVisibleToViewer` | Collection-scoped hubs | already paged |
| VIDEON | BFF `/api/collections` + Access Model B | media list scoped to accessible Collections | BFF should page; client consumes aggregated list |

## Backlog (not this slice)

- AUDION persona detail direct-URL gate (list already filtered)
- Invite-accept fan-out to product-local members (Plexon assignment is enough for live filter)

## Paths

- Plexon: `GET /api/platform/provisioning/accessible-collections` (`nextCursor`)
- CHECKION: `specs/domain/access-model-b-visibility.md`
