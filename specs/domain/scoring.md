# Scoring — CHECKION v3

## Status
Accepted (Phase 1)

## Score kinds (MVP)
`accessibility`, `seo`, `best_practices`, `performance`, `ux`, `eco`, `generative` — each `value`/`max` (typically 0–100).

## Deep scan aggregation
Corpus means per kind live on `DomainOverview.scores` and on `DomainScanLight.scoresByKind` (list/hub/catalog without full Overview). Same numbers; no separate formula.

## Display mapping
| Contract | DS |
|----------|-----|
| Overall / counts | `StatLede` / `StatLedeGroup` |
| Per-kind strip | `Meter` + `MeterList` (disabled for read-only) · Deep snapshot `LabTile`s |
| Severity | static `Chip` + `RankedRow` secondary |

No product-forked score atoms — gaps go to `specs/domain/ds-component-gaps.md` then msqdx-ui.
