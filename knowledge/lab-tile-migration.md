# LabTile React migration (local iteration)

**Date:** 2026-09-14

## Status
CHECKION Checks + PLEXON Quickscan domain magazine now render `@msqdx/ui` `LabTile` / `LabTileStrip` (sibling source via barrels). Soft radius/type live in DS CSS (`.ds-lab-tile*`).

## Local-first
Iterate against sibling `msqdx-ui` — no Coolify pin bump required until the LabTile API feels stable.

```bash
# checkion
cd apps/web && npx vitest run __tests__/soft-lab-tiles.test.ts __tests__/panels.test.tsx

# plexon
npx vitest run __tests__/soft-eqc-lab-tiles.test.ts
```

## Follow-up
- Thin leftover `.checkion-lab-tile` / `.plexon-eqc-lab-tile` CSS once no consumers remain
- Optionally migrate METRON KPI strip onto `LabTile` later
