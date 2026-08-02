# GEO On-page E-E-A-T — CHECKION v3

## Status
Accepted as **optional appendix** to a GEO competitive job. Live launch later.

## Scope
On-page Experience / Expertise / Authoritativeness / Trustworthiness / GEO fitness scores when a **page reading** is attached to a GEO job.

**Competitive LLM presence** (citations, placement, share of voice, solo/field) is specified in [`geo-competitive-presence.md`](./geo-competitive-presence.md) — that is the primary GEO product.

## Model
GEO remains a **separate job type**, not a `ScanMode` (`single` | `deep`).

| Surface | Path |
|---------|------|
| Index | `/geo` |
| Result | `/geo/:id/overview` · `/queries` (legacy `/placement` → Queries) |
| Reading API | `GET /api/geo-jobs/:id/reading?kind=verdict\|eeat\|placement\|queries\|query` |

## Magazine placement
On overview, E-E-A-T renders **below** competitive Presence / Moves, and **only if** `GeoOverview.eeat` is present.

`kind=eeat` readings stay available when on-page scores exist.

## Contracts
`GeoEeatScores` optional on `GeoOverview.eeat`.

## Fixtures
Dürr (`geo-1`) includes `eeat`. Solo fixture (`geo-3`) may omit it.
