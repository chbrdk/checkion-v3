# GEO Competitive Presence — CHECKION v3

## Status
Accepted (spec-driven). Fixtures + derive helpers land with this spec. **Phase 3 live GEO** lands job create + OpenAI queryRuns → same `finalize` / presence helpers (`CHECKION_LIVE_GEO` / `DATABASE_URL` + `OPENAI_API_KEY`). Multi-provider competitive cron remains deferred.

## Purpose
Answer: **Where do we appear in answer engines?** — citations, placement, model/query coverage — not on-page page quality.

On-page E-E-A-T / GEO fitness is an **optional appendix** only when a page reading is attached. See [`geo-eeat.md`](./geo-eeat.md).

Actionable prompt/answer insights (miss-vs-rival, head-to-head, answer dossier, auto moves, intents, co-citation, model disagreement) are specified in [`geo-answer-insights.md`](./geo-answer-insights.md).

## Job type
GEO is a **separate job type**, not a `ScanMode` (`single` | `deep`).

### Inputs
| Input | Required | Notes |
|-------|----------|--------|
| Target URL / host | yes | Normalized host is `targetHost` |
| Queries | yes | Prompt list |
| Models | yes | LLM IDs for the run matrix |
| Explicit competitors | no | Domains the user wants in the field |

### Surfaces
| Surface | Path |
|---------|------|
| Launch | `/scan?mode=geo` (central `ScanLaunchForm` — same place as Single/Deep; see `scan-modes.md`) |
| Index | `/geo` (catalog; create CTA deep-links to launch) |
| Result | `/geo/:id/overview` · `/queries` (legacy `/placement` → redirect to Queries) |
| Reading API | `GET /api/geo-jobs/:id/reading?kind=verdict\|eeat\|placement\|queries\|query` |
| Create API | `POST /api/geo-jobs` |

### Launch defaults
From `/scan` GEO mode the form may send:
- `queries` — editable magazine list (one prompt per row via `GeoQueryList`), or host-derived defaults when empty after trim; **Suggest** uses `POST /api/geo/suggest-queries` (fixture host pool without `OPENAI_API_KEY`, OpenAI when keyed)
- `models` — multi-select chips from `lib/geo/model-catalog.ts` (`GeoModelChips`); defaults to recommended `gpt-5.4-nano`; live POST filters to OpenAI-supported ids (see `geo-model-catalog.md`). Server still falls back to `OPENAI_MODEL` / `gpt-5.4-nano` when omitted
- `url` + `projectId` — required

After create, navigate to `/geo/:id/overview`.

## Atoms

| Atom | Definition | Source |
|------|------------|--------|
| **QueryRun** | One model answer for one prompt | LLM |
| **Citation** | `{ domain, position, context? }` in that answer | Parsed |
| **Cell** | Query × Model | Derived |
| **TargetHit** | Target appears in that cell’s citations; optional 1-based position | Derived |
| **RivalSet** | Explicit competitors ∪ domains discovered from citations (target excluded) | Job + Derived |

## Rival discovery

1. Start with explicit `competitors` (normalized hosts).
2. Scan all `queryRuns[].citations[].domain`; count mentions; exclude `targetHost` and empty.
3. Merge: explicit first, then discovered by descending mention count.
4. Cap field at **Top 5** rivals (plus target). Remaining non-target mentions roll into **`other`**.
5. `rivalSource`:
   - `none` — no rivals after merge
   - `explicit` — only explicit
   - `discovered` — only from citations
   - `mixed` — both

**Policy:** Solo presence always. Field / Share of Voice only when `rivals.length >= 1`.

## Metrics

### Solo (always)

| Metric | Formula |
|--------|---------|
| `cellCount` | `queryRuns.length` (one cell per run) |
| `hitCount` | cells where target is cited (`ourPosition != null` or citation domain matches target) |
| `citedShare` | `round(100 * hitCount / cellCount)` (0 if no cells) |
| `missRate` | `100 - citedShare` |
| `avgPosition` | mean of hit positions (null if no hits) |
| `firstCiteRate` | `round(100 * firstCiteHits / hitCount)` (null if no hits); first-cite = position === 1 |
| `byModel[]` | per `modelId`: `{ modelId, cellCount, hitCount, hitRate }` |
| `byQuery[]` | per query: `{ query, cellCount, hitCount, hitRate }` |

### Field (only if rivals ≥ 1)

Mention = one citation of a domain in a run (each citation counts once).

| Metric | Formula |
|--------|---------|
| Domain `mentionCount` | Citations of that domain across all runs (field domains + target; `other` for remainder) |
| Domain `shareOfVoice` | `round(100 * mentionCount / totalFieldMentions)` |
| Domain `avgPosition` | Mean citation position for that domain when mentioned |
| `gapToLead` | `SoV_lead − SoV_target` (points; negative ⇒ target ahead) |
| `leaderDomain` | Non-target field domain with highest SoV (or null if only target) |

`totalFieldMentions` = mentions of target + rivals + `other` bucket (only if other > 0).

## Presence payload

Derived via `lib/geo-presence.ts` from `queryRuns` + `competitors` + `targetHost`:

```ts
presence: {
  solo: GeoPresenceSolo
  field: GeoPresenceField | null  // null when rivalSource === 'none'
  rivals: string[]
  rivalSource: 'explicit' | 'discovered' | 'mixed' | 'none'
}
```

Legacy `shareOfVoice[]` on `GeoOverview` remains as a convenience mirror of `field.shareOfVoice` when field exists (empty array when solo-only).

## Magazine surfaces

| Section | Job | With field | Solo-only |
|---------|-----|------------|-----------|
| **Verdict** | Reading + snapshot | citedShare, queries, avgPos | same |
| **Presence** | Core analysis | Solo KPIs + You-vs-rival duel + SoV race | Large citedShare + miss-by-query + model-coverage strips — **no duel** |
| **Opportunities** | Insights | Miss-vs-rival + prompt scoreboard + intents | Prompt scoreboard only (no steal rows) |
| **Queries** | Answer dossier + model placement strip | Prompt reading + answers + cell analysis; compact rank strip (`positionMatrix` / cell analysis) | same without rival steal |
| **Moves** | Derived recommendations | Miss / lose / first-cite / cite-split (+ fixture merge) | Misses & first-cite |
| **On-page** | Optional | `eeat?` | omit if absent |

**Placement section deferred** — folded into Queries strip; not a nav section. Legacy `/placement` redirects to Queries.

## UI components
- `GeoPresenceStage` — switches Solo vs Field from `presence`
- Overview Opportunities + Queries answer dossier — see [`geo-answer-insights.md`](./geo-answer-insights.md)
- Model placement strip / citation map cells deep-link within Queries (`?q=` / `model=`) — see answer-insights spec

## Non-goals (v1 competitive)
- On-page E-E-A-T, llms.txt, Schema, discoverability page scores (Scan / Domain)
- Editable meters / sliders for scores
- Live Plexon federation (deferred)
- Per-answer live LLM (prompt-level reading only)
- **Multi-provider competitive cron** (Claude + Gemini + history reruns) — deferred; Phase 3 uses OpenAI query×model runs only. See `knowledge/dummy-data-mode.md` (“Live GEO pipeline”).

## Contracts
`GeoPresenceSolo`, `GeoPresenceField`, `GeoRivalSource`, `GeoPresence` in `@checkion-v3/contracts`; `GeoOverview.presence`.  
`GeoInsights` on `GeoOverview.insights` — see answer-insights spec.

## Fixtures
- Field: Dürr (`geo-1`) — explicit competitors + citations  
- Solo: `geo-3` — no competitors; citations only target / none → `rivalSource: 'none'`

## Tests
- `apps/web/__tests__/geo-presence.test.ts` — solo metrics, discovery, SoV with `other`, empty runs
- `apps/web/__tests__/geo-insights.test.ts` — duels, miss-vs-rival, cell analysis
