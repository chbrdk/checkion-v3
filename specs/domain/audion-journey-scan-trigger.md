# AUDION journey → single-page scan trigger — CHECKION v3

## Status
Accepted — implemented (AUDION journey → single-page scan handoff).  
Companion (AUDION): `audion-v3/specs/domain/checkion-single-scan-trigger.md`.

## Decision
AUDION owns Explore / UX Journey. CHECKION owns Scan / a11y. When AUDION optionally hands off a **step URL**, CHECKION runs a normal **`mode: single`** (WCAG Quick single) scan on the Collection’s CHECKION binding — not a domain crawl, SEO launch, GEO job, or Journey UI.

## Ownership
| Concern | Owner |
|---------|--------|
| Journey / Chat-Inspect / Studies | AUDION |
| Single-page scan + results | CHECKION |
| Collection + both mirrors | PLEXON (`collection-projects.md`) |

## Trigger
AUDION BFF (or user deep-link) calls existing scan API:

```http
POST /api/scans
Authorization: Bearer <checkion_api_token>
Content-Type: application/json

{
  "projectId": "<checkion binding id>",
  "mode": "single",
  "url": "<step url>",
  "platformProjectId": "<optional>",
  "audionRunId": "<optional>",
  "stepUrl": "<optional>"
}
```

See `specs/api/scans.md` for the extended optional correlation fields.

## Auth (product path)
| Caller | Auth |
|--------|------|
| AUDION BFF / machine | `Authorization: Bearer checkion_…` (Settings API tokens — already gated on `POST /api/scans` when Plexon auth is configured) |
| User in browser | NextAuth session (deep-link → `/scan`) |
| Out of scope here | `X-Service-Secret` (Plexon provisioning only — `specs/domain/plexon-federation.md`) |

## Correlation
`platformProjectId`, CHECKION `projectId`, optional `audionRunId` / `stepUrl`. Store on scan metadata when implemented so results can cite the AUDION run.

## Deep-link
Extend launch query (today: `projectId`, `mode`):

```text
/scan?projectId=<id>&mode=single&url=<encoded>
```

After submit → existing `/results/[id]/…` (`specs/domain/scan-modes.md`, `scan-result-workspace.md`).  
Bases: `knowledge/paths.md` (`NEXT_PUBLIC_CHECKION_URL` / staging `URL_CHECKION_V3`).

## Non-goals
- No live Journey Agent UI / Customer Journey map in CHECKION (see `journey-ui.md`, `journey-agent-island.md`)
- No agent soft-fork into CHECKION for this path
- No domain crawl (`deep` / `seo` / `POST /api/domain-scans`) or GEO job from this trigger

## Phasing
Spec · deep-link `/scan` prefill · correlation on `POST /api/scans` · results “From Audion” chrome — **done**. AUDION BFF Bearer path remains optional.

## Upstream — Collection Test Flow (Plexon)

When Plexon orchestrates a Collection graph that includes `scan` / `score_gate` / `issue_gate` nodes, CHECKION remains owner of single-page scan execution; Plexon owns dispatch + Collection verdict. Spec: `plexon-v3/specs/domain/collection-test-flow.md`. This handoff API is the Wave-1 quality segment primitive.
