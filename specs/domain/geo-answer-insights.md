# GEO Answer Insights — CHECKION v3

## Status
Accepted. Derived from `queryRuns` + rival set; fixtures land with this spec.

## Purpose
Make competitive presence **actionable** beyond aggregate Share of Voice:

1. **Miss-vs-rival** — cells where a rival is cited and the target is not.
2. **Head-to-head by prompt** — who wins each query across models.
3. **Answer cell analysis** — structural read of each model answer (citation stack + light prose heuristic).
4. **Prompt readings** — short magazine sentences (deterministic fallback; optional OpenAI), not per-answer LLM.
5. **Auto moves** — derived next-move recommendations from miss / lose / first-cite gaps.
6. **Intent tags** — branded | comparison | how-to | other on each prompt.
7. **Co-citation KPIs** — field-only share of cells where target is co-cited vs alone.
8. **Model disagreement** — same prompt, models disagree on citing target or on first domain.

Builds on [`geo-competitive-presence.md`](./geo-competitive-presence.md).

## Surfaces

| Surface | Role |
|---------|------|
| Overview | Competitive summary + snapshot stats + Opportunities + prompt scoreboard + co-cite strip (field) + disagreement chips + **Next moves** (derived); deep-link `?q=` into Queries |
| Queries | **Answer dossier only** — no section-level steal narrative or Prompts/Cited/Steals strip (Overview owns those). Prompt reading, intent tag, disagreement chip; **compact placement strip** for all models (rank / miss / steal); click switches a **single** answer + citation rail (no stacked answers); `?model=` deep-link selects the cell; prompt switch preserves model when present |

**Placement (deferred):** former magazine nav section is out of the IA for now. Citation dossier + model rank strip live on **Queries**; competitive narrative stays on Overview. Old `/geo/:id/placement` URLs redirect to Queries (preserve `?q=`). `kind=placement` reading API remains available.

Reading API: `GET /api/geo-jobs/:id/reading?kind=verdict|eeat|placement|queries|query`  
`kind=query` requires `query=` (URL-encoded prompt text).

## Derived atoms

### Answer cell analysis (`GeoAnswerCellAnalysis`)

One per `queryRun`:

| Field | Rule |
|-------|------|
| `queryId`, `query`, `modelId` | From run |
| `citationStack` | Citations sorted by `position` ascending: `{ domain, position, context? }` |
| `firstDomain` | Domain at position 1, else first in stack, else null |
| `targetPosition` | Target hit position (same rules as presence `targetHit`) |
| `rivalDomains` | Intersection of citation domains with rival set |
| `coCited` | Target hit **and** `rivalDomains.length >= 1` |
| `stolenBy` | Rival at #1 when target miss **or** target position > 1; domain of #1 rival, else null |
| `targetMentionedInAnswer` | Case-insensitive host token match in `answerText` (strip TLD noise: match registrable label, e.g. `durr` from `durr.com`) |

### Miss-vs-rival (`GeoMissVsRival`)

Cells where target **miss** and ≥1 **rival** is cited.

| Field | Rule |
|-------|------|
| `query`, `modelId` | Cell keys |
| `rivalDomain` | Best rival in that cell (lowest `position`, then alpha) |
| `rivalPosition` | That rival’s position |
| `otherRivals` | Other rivals cited in the cell |

Sort: `rivalPosition` asc, then rival domain SoV (if field present) desc. Cap at **8** for overview.

Solo (`rivals.length === 0`): list is **empty**.

### Prompt duel (`GeoPromptDuel`)

One row per prompt in `queries`:

| Field | Rule |
|-------|------|
| `query` | Prompt text |
| `targetHitRate` | % of models citing target for this prompt |
| `targetAvgPosition` | Mean target position on hits (null if no hits) |
| `leaderDomain` | Among field domains (target + rivals) with citations on this prompt, domain with most mentions; ties → best (lowest) mean position; null if none |
| `outcome` | See below |
| `intent` | From intent tag for this prompt |

**Outcomes**

| Outcome | When |
|---------|------|
| `solo` | No rivals in job |
| `miss` | Target hitRate === 0 (with rivals: still `miss` even if rivals appear) |
| `win` | Target is `leaderDomain` and hitRate === 100, or sole cited field domain |
| `tie` | Target and at least one rival share top mention count on the prompt |
| `lose` | Rival is `leaderDomain` (or target not leader) while target has some hits — or target miss already covered |

Precision for field:

1. If rivals empty → `solo` (hitRate 0 still `solo` with implied miss narrative in UI).
2. Else if target hitRate === 0 → `miss`.
3. Else compute mention counts per field domain across runs for that query.
4. Let `top` = max mention count. Leaders = domains with that count.
5. If target in leaders and leaders.length === 1 → `win`.
6. If target in leaders and leaders.length > 1 → `tie`.
7. Else → `lose`.

### Intent tags (`GeoPromptIntentTag`)

One per prompt. Values: `branded` | `comparison` | `how-to` | `other`.

| Source | Rule |
|--------|------|
| Fixture override | Optional `queryIntents[query]` on overview draft — wins |
| Heuristic | Else: `vs` / `versus` / `compare` / `alternative` → `comparison`; `how to` / `how do` / `how can` → `how-to`; host token or full host in query → `branded`; else `other` |

Surface as chips on scoreboard, opportunities, and Queries accordion. Light grouping by intent on scoreboard is fine — no heavy filter UI.

### Co-citation stats (`GeoCoCitationStats`)

**Field only** (`rivals.length >= 1`). Solo → `null` on insights (omit strip).

Among **all cells**:

| Field | Rule |
|-------|------|
| `cellCount` | `cells.length` |
| `coCitedCount` | Cells with `coCited === true` |
| `aloneCiteCount` | Target hit **and** `rivalDomains.length === 0` |
| `coCitedRate` | `round(100 * coCitedCount / cellCount)` |
| `aloneCiteRate` | `round(100 * aloneCiteCount / cellCount)` |

### Model disagreement (`GeoModelDisagreement`)

One entry per prompt where models disagree (≥2 runs for that prompt):

| `kind` | When |
|--------|------|
| `cite_split` | Some models cite target, some miss |
| `first_domain_split` | ≥2 distinct non-null `firstDomain` values across models |

Prefer emitting **both** kinds when both apply (separate rows, or one row with primary `cite_split` plus `firstDomains` when also split). Cap overview chips at **6**.

| Field | Rule |
|-------|------|
| `query` | Prompt |
| `kind` | Above |
| `hitModels` / `missModels` | For `cite_split` |
| `firstDomains` | Distinct first domains (sorted) when kind includes first-domain split |

### Auto moves (`GeoRecommendation` derived)

Derive next moves from insights (not static copy alone). Priority order:

1. **Miss-vs-rival** — one move per distinct `(query, rivalDomain)` from top miss rows (high).
2. **Lose / miss duels** — prompt where `outcome` is `lose` or `miss` (high/medium).
3. **First-cite gap** — when presence solo `firstCiteRate` is non-null and `< 50` and there are hits (medium).
4. **Cite-split disagreement** — models disagree on citing target (medium).

Cap derived list at **5**. Each move sets `source: 'derived'` and optional `query` for deep-link.

**Merge with fixtures:** derived is source of truth when non-empty. Append fixture recommendations whose `id` is not already present. Cap combined list at **6**. When derived is empty (edge case), keep fixture list as-is.

## Payload

```ts
insights: {
  promptDuels: GeoPromptDuel[]
  missVsRival: GeoMissVsRival[]  // capped top 8
  cells: GeoAnswerCellAnalysis[]
  intents: GeoPromptIntentTag[]
  coCitation: GeoCoCitationStats | null
  disagreements: GeoModelDisagreement[]
  moves: GeoRecommendation[]  // derived only; overview.recommendations = merge(moves, fixture)
}
```

Always present on `GeoOverview` (derived in fixture `finalize` / later job pipeline via `lib/geo-insights.ts`).

## Deep-links

| From | To |
|------|----|
| Overview citation map / model strip cell (query × model) | `/geo/:id/queries?q=<prompt>&model=<modelId>` |
| Opportunities / scoreboard / moves | `/geo/:id/queries?q=<prompt>` (model optional) |
| Legacy `/geo/:id/placement` | Redirect → `/geo/:id/queries` (preserve `?q=` when present) |

Queries opens the matching prompt and selects the model strip cell when `model` is set.

## Readings

| Kind | Scope |
|------|--------|
| `queries` | Section-level (existing) |
| `query` | One prompt — uses duel + miss cells + sample answer snippets |

Fallback is deterministic from insights. OpenAI optional when `OPENAI_API_KEY` is set (same pattern as other GEO readings).

## Non-goals

- Per-answer live LLM analysis
- Sentiment / recommendation-language / claim extraction
- New magazine nav section (reuse Queries)
- Traffic correlation
- **Live LLM job launch / Plexon federation pipeline** — deferred; see competitive-presence non-goals and `knowledge/dummy-data-mode.md`

## Contracts

`GeoAnswerCellAnalysis`, `GeoPromptDuel`, `GeoMissVsRival`, `GeoPromptDuelOutcome`, `GeoPromptIntent`, `GeoPromptIntentTag`, `GeoCoCitationStats`, `GeoModelDisagreement`, `GeoInsights` on `GeoOverview.insights`.  
`GeoRecommendation.source` optional (`derived` | `fixture`).

## Tests

`apps/web/__tests__/geo-insights.test.ts` — duel outcomes, miss-vs-rival filter, solo empty miss list + null coCitation, `stolenBy`, host mention heuristic, intent heuristic, derived moves, disagreement, co-cite rates.
