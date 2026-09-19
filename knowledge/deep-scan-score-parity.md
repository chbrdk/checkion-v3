# Deep-scan score parity (GEO-style kind means)

Corpus means per ScoreKind (`accessibility`, `seo`, `performance`, `best_practices`, `ux`, `eco`, `generative`, …) are the Deep parallel to GEO dials — **not** answer-engine `citedShare`.

## Surfaces

| Surface | Shape |
| --- | --- |
| `DomainScanLight.scoresByKind` | Partial map kind → 0–100 (rounded means) |
| Magazine overview | LabTile snapshot (weakest 4 + overall) + `ScoresPanel` |
| Project hub deep list | Meta `a11y 72 · geo 61` via `formatDomainScoresByKindMeta` |
| Plexon `buildDomainCatalogBundle` | `scores` object (same as single-scan catalog) |
| Plexon flow / EQC / domain executor | `fetchCheckionDomainScanScores` (detail map, else overview `scores`) |

## Overall vs kind means

`overallScore` / spider `score` = **unweighted** mean of page overalls (`meanDomainOverallScore`). Legacy home depth 1.5× weight removed so spider finalize matches adapt / magazine.

## Paths

- Checkion adapt: `apps/web/lib/scan/adapt-scan-result.ts`
- Overall helper: `apps/web/lib/scan/domain-overall-score.ts`
- Checkion hub helper: `apps/web/lib/domain-scores-by-kind-meta.ts`
- Plexon fetch: `lib/integrations/checkion-domain-scans-v3-client.ts` → `fetchCheckionDomainScanScores`
- Specs: `specs/domain/domain-scan-sections.md`, `specs/domain/scoring.md`

Out of scope: answer-engine GEO (`citedShare`) on Deep crawls.
