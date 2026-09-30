# Page classification LLM (live)

**Status:** Accepted — Wave 2 (2026-09-02); Qwen Flash via OpenRouter (2026-09-30)  
**Implements:** `apps/web/lib/scan/llm/page-classification.ts`  
**Unblocks:** audion site-topics, persona page ranking quality

## Goal

Replace Phase 2 stub (`classifyPageWithLlm` → `null`) with live classification on single-page scans, persisted on deep-scan corpus rows.

## Output shape

Uses existing `PageClassificationSnapshot`:

- `shortSummary` (1–2 sentences, DE or EN from page `htmlLang` / scan locale)
- `tags[]` (3–8 lowercase topic tokens)
- `intensityTier` 1–5 (derived as max of `tagTiers`)
- optional `tagTiers` (`{ tag, tier }[]`)

## When it runs

| Path | Trigger |
|------|---------|
| Single scan | Always when live scans + `OPENROUTER_API_KEY` |
| Deep scan | Always (same per-page path as single); opt out with `classifyPageTopics=false` |
| Re-scan | Operator re-run domain job |

## Model

- **Default:** OpenRouter `qwen/qwen3.7-flash` (`CHECKION_PAGE_CLASSIFY_MODEL`, falls back to same default as Market field suggest)
- Transport: OpenRouter chat completions + `response_format: json_object`
- **Not Jev** — Jev has no free-text tags/summary; keep System One for closed gates only

## Acceptance

- **MUSS** `GET /api/domain-scans/:id/pages` rows include non-empty `classification.tags` after live deep scan (when key present).
- **MUSS** fail open: scan completes even if classification fails (log + null classification).
- **MUSS NOT** block scan pipeline on LLM timeout >30s (skip classification for that page).

## Tests

- Stub LLM returns tags → adapt-scan-result persists on overview
- Parser rejects empty / malformed payloads
- Deep scan with flag → corpus page overview has classification
