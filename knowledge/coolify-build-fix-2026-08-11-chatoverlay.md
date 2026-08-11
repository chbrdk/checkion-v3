# Coolify build failure — 2026-08-11 (ChatOverlay missing on pinned DS)

**Symptom:** Coolify `checkion-v3` deploy failed at `RUN npm run build` with:

```
./lib/msqdx-ui-client.ts
Module not found: Can't resolve '…/msqdx-ui/…/ChatOverlay'
```

## Cause

`PlatformAssistantHost` re-exports `ChatOverlay` from the sibling DS, but `MSQDX_UI_REF` was still on `621fda3` (pre-ChatOverlay). Docker only has the pinned fetch — local sibling checkout can hide the gap.

## Fix

Bump `MSQDX_UI_REF` to a SHA that exports `ChatOverlay` (aligned with brandion: `5323011…`), assert `ChatOverlay.tsx` in the Dockerfile, strip DS `node_modules` + symlink app tree during build (`msqdx-ui/knowledge/react-types-dedupe.md`), and prefer app `node_modules` via `next.config` `resolve.modules`.

## Verify

```bash
cd apps/web && npx vitest run __tests__/dockerfile-packaging.test.ts
# Coolify force-deploy checkion-v3
```
