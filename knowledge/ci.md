# CI — CHECKION v3

From day 1 (unlike CHECKION v2 root):

- Vitest (specs inventory + smoke)
- `npm run build` on PR
- Workflow: `.github/workflows/ci.yml`

No Coolify deploy from this workflow until staging credentials exist.

Dockerfile packaging: Vitest `__tests__/dockerfile-packaging.test.ts` asserts root `Dockerfile` + `.dockerignore` and msqdx-ui clone. Attach steps: `knowledge/staging-coolify.md`.
