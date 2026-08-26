# App shell — CHECKION v3

## Status
Accepted (Phase 1); Central Assistant host — 2026-08-10

## Goal
Magazine app chrome via `@msqdx/ui` only: `AppFrame`, `NavRail`, `BrandCorner`, settings avatar, `ChatOverlay` host for platform Assistant. **No** global `header.topbar` / `PageTitle` chrome — page identity lives in magazine covers, launch heroes, or in-page leads.

## Brand
- BrandCorner label: **CHECKION**
- No MUI layout, no `MsqdxAppLayout`, no `@msqdx/react`

## Primary nav (MVP)
| Id | Route | Notes |
|----|-------|-------|
| home | `/` | Home magazine (recent runs) |
| scan | `/scan` | Launch single/deep |
| projects | `/projects` | Collection hub — tiles or list |
| jobs | — | Notification center (rail footer button, not a route) |
| settings | `/settings` | Quiet federation/auth page (footer/rail) |

**Dropped:** Results index (`/results` list) — singles live via Home / Projects / job notifications → `/results/:id/overview`. Bare `/results` redirects home.

The **Jobs** control lives in the NavRail footer (above Settings). It opens the global notification center panel beside the rail — not in the topbar.

Authenticated shell MUST mount `PlatformAssistantHost` (FAB + `ChatOverlay` → Plexon `/assistant/embed`). Plexon base from `paths` / runtime-config — never hardcode. Spec: `plexon-v3/specs/domain/central-assistant-flyout.md`.

Deferred nav: Deep-Scans hub, Developers, GEO, Journey Agent live.

## Shell metrics
Documented in `knowledge/paths.md` / `apps/web/lib/paths.ts` (rail inset/gap/width, gutters).
