# Scan run delta (Gegentest) — CHECKION v3

**Status:** Accepted (Wave E3) — 2026-09-25  
**Program:** `specs/domain/suite-enterprise-program.md` § E3 · Plexon SoT `plexon-v3/specs/domain/suite-enterprise-program.md` § E3  
**Federation:** `2026-05-plexon-federation-v3`

## Purpose

A completed run compares itself to the **previous** completed run of the **same kind** and **same URL set**. The delta feeds the existing result magazines and the Flow run catalogue — it does **not** invent a second Reports product.

| Kind | Source | Previous match |
|------|--------|----------------|
| `single` | WCAG / page scan | Same `projectId`, same normalized page URL |
| `deep` | Domain / SEO crawl | Same `projectId`, same URL set (corpus pages when stored; else normalized `rootUrl`) |
| `geo` | GEO job | Same `projectId`, same normalized target URL, **same `measurement`** (`recall` \| `live`) |

## Findings

Findings are compared by stable key:

| Kind | Key |
|------|-----|
| `single` / `deep` | `section::ruleId` (same grouping as magazine issue groups) |
| `geo` | `rec::{recommendationId}` |

Buckets:

| Bucket | Meaning |
|--------|---------|
| `new` | Present in current, absent in previous |
| `gone` | Present in previous, absent in current |
| `same` | Present in both |

Severity / title on the ref come from the **current** side when in `new`/`same`, and from the previous side when in `gone`.

## Score deltas

Per scoring kind: `current − previous` (null when either side lacks that kind).

| Kind | Score kinds |
|------|-------------|
| `single` / `deep` | Contract `ScoreKind` (`accessibility`, `seo`, `performance`, `best_practices`, `ux`, `eco`, `generative`) |
| `geo` | `cited_share` (0–100); when on-page E-E-A-T is attached also `eeat_experience`, `eeat_expertise`, `eeat_authoritativeness`, `eeat_trustworthiness`, `eeat_geo_fitness` |

## GEO layers

Model memory (`recall`) and Live search (`live`) **never** share a baseline. Two layers → two independent deltas (program Acceptance). Mixing layers is a named error `measurement_mismatch` when an explicit `previousId` crosses layers.

## No baseline

When no eligible previous run exists (or explicit `previousId` is missing / ineligible), the API returns a **named error** `no_baseline` — never an empty success payload.

## Surfaces (non-goals for this spec)

- Delta **payload** + pure compare helper + read APIs (this wave).
- Magazine chrome and Flow `retest` node catalogue write remain separate; Reports magazine stays deferred (`project-reports.md`).

## Related

[`suite-enterprise-program.md`](./suite-enterprise-program.md) · [`scoring.md`](./scoring.md) · [`geo-measurement-layers.md`](./geo-measurement-layers.md) · [`scan-result-workspace.md`](./scan-result-workspace.md) · API [`../api/scan-run-delta.md`](../api/scan-run-delta.md)
