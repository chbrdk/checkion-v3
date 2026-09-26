# Domain scan sections — CHECKION v3

## Status
Accepted (Phase 1) — domain magazine distinct from single

## MVP sections
`overview`, `issues`, `detail` only. Legacy `scores` redirects to `detail`.

## Principle
Deep magazine summarizes **all single-page scans in a deep scan corpus**. It is not the single-page magazine with aggregates shoehorned into page title/meta fields.

| | Single (`ScanOverview`) | Deep (`DomainOverview`) |
|---|---|---|
| Unit | One URL / capture | Corpus of N page scans |
| Hero | Screenshot + page title | Domain host + page count + domain score |
| Issues | Marker ↔ rail on capture | Systemic issue groups by **pageCount** |
| Detail | Page facts | Coverage counts, averages, distributions |

## Payload (`DomainOverview`)
- `scan: DomainScanLight` (+ optional `industry`, `tags`, `issueStats`, **`scoresByKind`**)
- `scores`, `lede`, `systemicIssues[{ id, title, pageCount, severity? }]`
- Aggregate chapters: `performance` (avgs), `seoCoverage`, `ux` (+ readability bands), `eco` (+ gradeDistribution), `links`, `securityPrivacy`, `eeat`, `generative`, `infra`, `classification`
- `pageSamples[]` — overview teaser; each row’s `scanId` is a **persisted** corpus page scan (`{domainId}-p{n}`) with live capture

## Aggregated kind scores (list + hub + catalog)
- **WHEN** a deep scan completes **THEN** `DomainScanLight.scoresByKind` **MUST** hold the corpus mean for each `ScoreKind` present on page ScoreCards (same values as Overview `scores[]`).
- List/hub surfaces **MAY** show a short meta strip from `scoresByKind` without loading full Overview.
- Overview magazine **MUST** expose the same means as LabTiles (weakest kinds) plus the existing `ScoresPanel` RankedList.

## Persisted corpus page scans
Each deep crawl **must** persist every scanned page as a `scans` row:

- `mode: 'single'`, `domainScanId: <domainId>`, stable id `{domainId}-p{index}`
- `payload.overview` includes real `screenshotUrl` (`/api/scans/{id}/screenshot`)
- Standalone activity metrics ignore rows with `domainScanId` (no double-count)

Issue affected-page links prefer these rows (URL match). Virtual `dpage__` / `dsample__` ids remain **legacy fallback** only when no corpus page row exists (pre-persist jobs need a re-scan for captures).

## Magazine chapters
- **Overview** — scoreline with GEO-style LabTile snapshot (overall + weakest kind means) · `ScoresPanel` RankedList · `StatusMeterPanel` corpus signal · systemic `RankedList` · Margins & pace lab tiles · SEO 30/70 (reading + meters) · distribution donuts · Trust/GEO reading (LLM one-liner + fallback) · E-E-A-T / GEO readout bars · page-sample `RankedList` (rows → `/results/{scanId}/overview` with live capture)
- **Issues** — compact systemic groups (pages affected) with filter, pagination (25/page), accordion detail + affected-pages table (sorted by issue load, density filter, 25/page; rows link to corpus page `/results/{scanId}`); no screenshot canvas on the domain issues shell itself
- **Detail** — corpus ledger bands (same report chrome as single, aggregate facts + domain formulas)

## Corpus pages API (Wave 1)
Full slim list beyond `pageSamples` teaser: `specs/api/domain-scan-pages.md` — `GET /api/domain-scans/:id/pages`.

## Market SEO (separate)
Organic keywords / ranks / backlinks live under `/seo` Market hub — not domain magazine chapters. Optional cross-link from Overview meta when `projectId` + host known. Spec: [`seo-market-program.md`](./seo-market-program.md).

## Deferred
Crawl map / graph UI, prod 8-tab shell (visual-map, journey, …). Single rich overview spec does **not** apply to deep. Corpus SEO Quality checks (broken links, redirect chains, orphans, thin content) emit as systemic issues from the spider (`seo-broken-internal-links`, `seo-redirect-chains`, `seo-orphan-pages`, `seo-thin-content`).

## Live deep-scan wiring
`adaptDomainResultToContracts` must populate Overview aggregate chapters from the spider corpus (`seoCoverage`, `eeat`, `generative`, plus performance / ux / eco / links / securityPrivacy when page signals exist). Silent omission of SEO/Trust·GEO chapters when aggregates are missing is a bug, not an empty state. Existing thin payloads need a re-run (or backfill) after this lands. Page captures are written during the spider under the stable page-scan id and upserted into `scans` on domain complete.
