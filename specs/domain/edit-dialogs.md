# Edit dialogs — CHECKION v3

## Status
Accepted (Wave 4)

## Patterns
| Action | DS |
|--------|-----|
| Share result | `Dialog` — show URL, copy |
| Re-run scan | `ConfirmDialog` |
| Delete scan | `ConfirmDialog` `danger` |
| Create / edit project | `Dialog` — name, domain, description |
| Rename GEO job | `Dialog` — title (masthead **Rename**) |
| Archive project | `ConfirmDialog` `danger` → `POST /api/projects/:id/archive` (Plexon + local `archived`) |

No custom modal shells. Confirm closes after confirm; destructive flows navigate to projects or scan list.
