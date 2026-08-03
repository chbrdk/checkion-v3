# App shell — CHECKION v3

## Status
Accepted (Phase 1)

## Goal
Magazine app chrome via `@msqdx/ui` only: `AppFrame`, `NavRail`, `BrandCorner`, `PageTitle`, settings avatar.

## Brand
- BrandCorner label: **CHECKION**
- No MUI layout, no `MsqdxAppLayout`, no `@msqdx/react`

## Primary nav (MVP)
| Id | Route | Notes |
|----|-------|-------|
| home | `/` | Empty/home lede |
| scan | `/scan` | Launch single/deep |
| projects | `/projects` | Collection capability magazine grid |
| settings | `/settings` | Quiet federation/auth page (footer/rail) |

Deferred nav: Deep-Scans hub, Developers, GEO, Journey Agent live.

## Shell metrics
Documented in `knowledge/paths.md` / `apps/web/lib/paths.ts` (rail inset/gap/width, gutters).
