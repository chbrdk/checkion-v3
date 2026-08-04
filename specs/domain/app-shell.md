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
| results | `/results` | Scan results index |
| jobs | — | Notification center (rail footer button, not a route) |
| settings | `/settings` | Quiet federation/auth page (footer/rail) |

The **Jobs** control lives in the NavRail footer (above Settings). It opens the global notification center panel beside the rail — not in the topbar.

Deferred nav: Deep-Scans hub, Developers, GEO, Journey Agent live.

## Shell metrics
Documented in `knowledge/paths.md` / `apps/web/lib/paths.ts` (rail inset/gap/width, gutters).
