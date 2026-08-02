# AGENTS.md — CHECKION v3

1. Specs first. Update `specs/domain` or `specs/api` before changing behavior.
2. Shared UI primitives come from `@msqdx/ui`. Do not create app-local replacements when the primitive belongs in `msqdx-ui`. No MUI. No `@msqdx/react`.
3. No hardcoded URLs, paths, or service bases. Use env + `apps/web/lib/runtime-config.ts` and document canonical values in `knowledge/paths.md`. Routes only via `apps/web/lib/paths.ts`.
4. Tests with every change: UI smoke, contract checks, specs inventory, and build validation.
5. Use `packages/contracts` for stable project / scan / issue / score shapes consumed by the app.
6. CHECKION is a **capability** under a Plexon Collection project — do not invent a second project model.
7. Federation target is plexon-v3 only (`2026-05-plexon-federation-v3`). No shared Postgres with CHECKION v2.
8. Scan result IA: Overview = magazine (narrative teasers); Issues/Detail/(future lenses) = report depth. Issues pairs capture + finding overlays with the dossier list (heatmap layers later on the same canvas). Do not dump lens detail onto Overview — see `specs/domain/scan-result-workspace.md` § Magazine vs report.
