# DS component gaps — CHECKION v3

## Status
Accepted (Phase 1)

## Adopt from `@msqdx/ui` (MVP)
`AppFrame`, `NavRail`, `BrandCorner`, `PageTitle`, `Panel`, `SectionChrome`, `Field`, `Input`, `Select`, `Button`, `Alert`, `LoadingText`, `StatusDot`, `Chip`, `Meter`, `MeterList`, `StatLede`, `StatLedeGroup`, `RankedList`, `RankedRow`, `Accordion`, `DataTable`, `Avatar`, `Text`, `Hint`, `StatusMeterPanel`, `TopStatus`.

## GEO magazine (now on DS)
Composes: `Panel` · `SectionChrome` · `Text` · `Hint` · `Meter`/`MeterList` · `RankedList`/`RankedRow` · `StatLede`/`StatLedeGroup` · `Accordion` · `DataTable` · `Chip` · `Button`.

Still product-local: magazine cover/masthead + section nav (same pattern as domain/results).

## Candidate gaps (spec in msqdx-ui before product fork)
| Need | Why | Pilot |
|------|-----|-------|
| EditorialReading | Eyebrow + evaluative one-liner (today: `Text` meta + headline) | GEO / domain readings |
| SignalCallout | Tone + short body beyond StatLede | GEO placement signals |
| Series / position chart | Visual citation map (today: DataTable) | GEO placement |
| SeverityChip tone variants | Critical/serious/moderate/minor without ad-hoc CSS | Result issues |
| ScoreStrip (read-only meter group) | Magazine strip without editable Slider chrome | Overview |
| IssueRow | Dense rule/title/affected meta | Issues list |

Until DS ships extras: compose with existing primitives — no product forks.
