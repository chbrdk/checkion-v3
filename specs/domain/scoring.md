# Scoring — CHECKION v3

## Status
Accepted (Phase 1)

## Score kinds (MVP)
`accessibility`, `seo`, `best_practices`, `performance` — each `value`/`max` (typically 0–100).

## Display mapping
| Contract | DS |
|----------|-----|
| Overall / counts | `StatLede` / `StatLedeGroup` |
| Per-kind strip | `Meter` + `MeterList` (disabled for read-only) |
| Severity | static `Chip` + `RankedRow` secondary |

No product-forked score atoms — gaps go to `specs/domain/ds-component-gaps.md` then msqdx-ui.
