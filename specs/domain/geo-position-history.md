# GEO position history — CHECKION v3

## Status
Accepted (Phase 1 — soft match).

## Purpose
Operators re-run the **same questions** over time and see whether citation **positions** for the target host improved, declined, or stayed stable — Check-In v2 parity without porting MUI/Recharts.

## Linking (Phase 1 — soft match)
A history series groups completed GEO jobs that share:

| Field | Rule |
|-------|------|
| `projectId` | Same CHECKION project |
| `measurement` | Same layer (`recall` \| `live`) — **never mixed** |
| Query text | Normalized key: Unicode NFC → trim → collapse whitespace → casefold |

Jobs without overlapping queries do not contribute points to a series. Incomplete / failed jobs are excluded.

### Trend
Per series, using chronological `avgPosition` (mean of positive model positions; null when never cited in that sample):

| Trend | Rule (first → last valid avg) |
|-------|-------------------------------|
| `improving` | Δ ≤ −0.5 (lower rank is better) |
| `declining` | Δ ≥ 0.5 |
| `stable` | \|Δ\| < 0.5 with ≥2 valid points |
| `unknown` | Fewer than 2 valid points |

## Surfaces

| Surface | Behaviour |
|---------|-----------|
| Project workspace | Chapter **GEO History** — model filter + per-query cards with multi-series line chart (`@msqdx/ui` `SeriesChart`) |
| GEO magazine overview | Teaser when ≥1 series has ≥2 points for this job’s queries → deep-link to project history (`?chapter=geo-history`) |
| Citation map | Unchanged single-job evidence table |

## Honesty
- Never mix Layer 1 and Layer 2 in one series or chart.
- Phase 1 charts plot **target host** position only (competitor lines deferred).
- Labels: Model memory / Live search — not “ChatGPT app history”.

## Phase 2 (deferred — no Phase 1 code)
- Persist `parentJobId` / `seriesId` on Re-run; prefer hard lineage when present; soft match remains fallback.
- Competitor series on charts; scheduled competitive cron (see [`geo-competitive-presence.md`](./geo-competitive-presence.md)).

## Non-goals (Phase 1)
- Porting v2 Recharts / `@msqdx/react` / MUI.
- PDF / project reports history.
- METRON federation export of history payloads.

## Related
[`geo-competitive-presence.md`](./geo-competitive-presence.md) · [`geo-measurement-layers.md`](./geo-measurement-layers.md) · [`project-workspace.md`](./project-workspace.md) · API [`../api/geo-position-history.md`](../api/geo-position-history.md) · DS [`msqdx-ui` SeriesChart](../../../msqdx-ui/specs/domain/msqdx-ui-series-chart.md)
