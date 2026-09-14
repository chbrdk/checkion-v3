# Page classification LLM (live)

**Status:** Accepted — Wave 2 (2026-09-02)  
**Implements:** `apps/web/lib/scan/llm/page-classification.ts`  
**Unblocks:** audion site-topics, persona page ranking quality

## Goal

Replace Phase 2 stub (`classifyPageWithLlm` → `null`) with live classification on single-page scans, persisted on deep-scan corpus rows.

## Output shape

Uses existing `PageClassificationSnapshot`:

- `shortSummary` (1–2 sentences, DE or EN from scan locale)
- `tags[]` (3–8 lowercase topic tokens)
- `intensityTier` 1–5
- optional `tagTiers`

## When it runs

| Path | Trigger |
|------|---------|
| Single scan | Always when `CHECKION_LIVE_SCANS` + API key |
| Deep scan | When `classifyPageTopics=true` on start (Plexon domain-scan-all already sends query param) |
| Re-scan | Operator re-run domain job |

## Model

- Default: catalog fast tier (`OPENAI_MODEL` / env) for volume
- Optional Anthropic path when `ANTHROPIC_API_KEY` + `CHECKION_PAGE_CLASSIFY_PROVIDER=anthropic`

## Acceptance

- **MUSS** `GET /api/domain-scans/:id/pages` rows include non-empty `classification.tags` after live deep scan with flag.
- **MUSS** fail open: scan completes even if classification fails (log + null classification).
- **MUSS NOT** block scan pipeline on LLM timeout >30s (skip classification for that page).

## Tests

- Stub LLM returns tags → adapt-scan-result persists on overview
- Deep scan with flag → corpus page overview has classification
