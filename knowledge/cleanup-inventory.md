# Cleanup inventory — checkion-v3

**Date:** 2026-09-26  
**Inventor:** agent (suite cleanup · Inventor)

| Path | Klasse | Nachweis | Notes |
|---|---|---|---|
| `knowledge/v2-v3-runtime-separation.md` | keep | `apps/web/__tests__/specs-inventory.test.ts` requiredSpecs · `knowledge/specs-index.md` | v2/v3-Grenze; Keep-Drop „Drop once unused“ — noch Test-Needle, nicht löschen. |
| `knowledge/scan-migration-map.md` | keep | specs-inventory + specs-index | v2→v3 Scan-Routing; nur Doc, aber Contract-Inventory. |
| `knowledge/domain-result-migration-map.md` | keep | specs-inventory + specs-index | Domain-Result-Schnitt MVP vs v2; gleiche Needle wie oben. |
| `knowledge/project-hub-migration-map.md` | keep | specs-inventory + specs-index | Collection/Hub-Mapping; Wave-5-Hinweise noch referenzwürdig. |
| `knowledge/dummy-data-mode.md` | keep | specs-inventory · `knowledge/paths.md` · `specs/domain/geo-answer-insights.md` | Aktive Fixture/Live-Gates; nicht obsolet trotz Keep-Drop-Kandidat „dummy-data notes“. |
| `apps/web/lib/fixtures/` (Corpus + `*-store.ts`) | reshape | Breite Import-Graph (App-Routes, APIs, Vitest) · Keep-Drop „Fixture-heavy local mode“ | Bleibt bis Staging/live-only; kein drop_safe (Runtime + Tests). |
| `knowledge/magazine-button.md` | drop_safe | Repo-Suche: keine Pfad-Strings außer Datei selbst | Einzeiler-Verweis auf `msqdx-ui`; kein specs-inventory-Eintrag. |
| `knowledge/magazine-lede-filter.md` | drop_safe | Keine Imports/Spec-Refs im Repo | Cutover-Notiz 2026-08-03; SSOT ist msqdx-ui `lede-filter-panel`. |
| `knowledge/lab-tile-migration.md` | defer | Keine Code-Refs; LabTile live in UI/Tests | Historische Local-Iteration; optional in `paths.md` MSQDX_UI_REF konsolidieren vor Drop. |
| `knowledge/coolify-build-fix-2026-08-11-chatoverlay.md` | drop_safe | Nur von `coolify-build-fix-2026-09-17-labtile.md` zitiert | Incident-Postmortem; Pin-Narrativ lebt in `knowledge/paths.md` / Dockerfile-Gate. |
| `knowledge/coolify-build-fix-2026-09-17-labtile.md` | drop_safe | Wie oben; nicht in paths/specs-inventory | Gleiches Muster ChatOverlay; nach Gatekeeper mit 08-11 zusammen prüfen. |
| `knowledge/sefe-staging-reset-2026-09-21.md` | drop_safe | Keine Repo-Refs | Einmalige Staging-Ops (SEFE archive); verweist auf fehlendes AUDION-Doc `target-group-project-id-alias.md`. |
| `knowledge/deep-scan-score-parity.md` | defer | Keine Pfad-Refs; Verhalten in `specs/domain/scoring.md` + Code | Nützliche Ops-Erklärung `scoresByKind`; vor drop_safe in Spec oder scoring.md mergen. |
| `knowledge/scan-worker-job-timeout-hdi-2026-09-23.md` | defer | Keine direkten Knowledge-Links; Fix in Code/Spec-Pfade | HDI-Timeout-Incident; behalten bis in `scan-worker`/`paths` Runbook verkürzt. |
| `knowledge/distillate-call-sites.md` | keep | `apps/web/__tests__/distillate-call-sites.test.ts` liest Datei | Enterprise-Distillate-Inventar; Test-gestützt. |
| `apps/web/public/fixtures/scans/scan-single-1-heatmap.svg` | keep | URL in `lib/fixtures/live-scan-single-1.ts` | Einziges Public-Fixture-Asset im Tree. |
| `apps/web/public/fixtures/scans/scan-single-1.jpg` · `scan-single-1.svg` | keep **done** 2026-09-26 | Referenced in fixtures | Placeholder assets added (Querschnitt). |
| `knowledge/checkion-deep-scan-sitemap.md` | keep **done** 2026-09-26 | `@see` in `sitemap.ts` | Companion stub → `scan-crawl-assets` spec. |
| `knowledge/collection-team-plexon.md` | keep **done** 2026-09-26 | `specs/domain/project-team.md` | Companion + Audion parity link. |
