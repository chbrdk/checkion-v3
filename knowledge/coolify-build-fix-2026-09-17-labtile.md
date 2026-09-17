# Coolify build fail — LabTile pin gap (2026-09-17)

## Symptom
`checkion-v3:main-app` Docker build fails at `next build`:

```
./lib/msqdx-ui.ts
Module not found: …/msqdx-ui/…/LabTile
```

## Cause
Magazine panels re-export `LabTile` from the curated barrel (`apps/web/lib/msqdx-ui.ts`), but `Dockerfile` `MSQDX_UI_REF` was still on `a5d4f46…` (pre-LabTile, Aug 2026). Local sibling `msqdx-ui` hid the gap.

## Fix
Bump `MSQDX_UI_REF` to `0249eb5270d645e70397731061d39df7ceabf7a3` (msqdx-ui `main` with LabTile + active). Assert `LabTile.tsx` + barrel export in the Dockerfile builder gate. Document in `knowledge/paths.md`.

Same pattern as `knowledge/coolify-build-fix-2026-08-11-chatoverlay.md`.
