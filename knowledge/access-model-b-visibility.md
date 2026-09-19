# Access Model B — CHECKION

Stand: 2026-09-19

## Summary

CHECKION capability projects and their runs (page scans, domain/deep, GEO) are visible only under Plexon **Access Model B**: owner or Collection assignment via `accessible-collections`. Company membership alone is not enough.

## Specs

- Domain: `specs/domain/access-model-b-visibility.md`
- Federation: `specs/domain/plexon-federation.md`
- Plexon SSOT: `plexon-v3/knowledge/access-model-b-project-visibility.md`

## Code

| Piece | Path |
|-------|------|
| Project ACL | `apps/web/lib/project-access.ts` |
| Run ACL helpers | `apps/web/lib/resource-access.ts` |
| Home | `apps/web/app/page.tsx` → `*ForViewer` |
| List APIs | `app/api/scans`, `domain-scans`, `geo-jobs` |

## Operator note

Invite a teammate on the **Plexon Collection** (invite / assignment). Local product “team” UIs in sibling apps do not replace Collection ACL.
