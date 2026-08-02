# Scan modes — CHECKION v3

## Status
Accepted (Phase 1)

## MVP modes
| Mode | Route | Result |
|------|-------|--------|
| `single` | `/scan` | `/results/[id]/{overview\|issues\|detail}` |
| `deep` | `/scan` | Same + `/domain/[id]/…` for light domain payload |

## Launch UX (single-first)
Magazine band on `/scan`:
- `Panel` + quiet `SectionChrome`
- `Hint panel` (dummy mode)
- `Field` / `Input` / `Select` / `Button`
- `TopStatus` ready · `LoadingText` submitting · `Alert` error
- Demo jump to fixture `scan-single-1`

## Deferred
Journey agent live, GEO / E-E-A-T job UI, performance-as-primary tab.
