# Journey agent island — CHECKION v3

## Status
Accepted decision (deferred implementation)

## Decision
**One agent service in the v3 island**, two product BFFs (Audion + CHECKION). Do not soft-fork agent runtimes per product.

## Non-goals for MVP
No live Journey Agent UI in CHECKION MVP. Spec only until Wave 5+.

## Related (not Journey UI)
Optional **single-page scan** handoff from AUDION explore URLs is a separate CHECKION Scan capability — see `audion-journey-scan-trigger.md`. That path must not reintroduce Journey-Agent UI or an agent soft-fork here.
