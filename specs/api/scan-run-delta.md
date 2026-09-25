# Scan run delta API — CHECKION v3

## Status
Accepted (Wave E3).

## Endpoints

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/scans/:id/delta` | Single-page vs previous (`paths.routes.apiScanDelta`) |
| GET | `/api/domain-scans/:id/delta` | Deep / domain vs previous (`paths.routes.apiDomainScanDelta`) |
| GET | `/api/geo-jobs/:id/delta` | GEO vs previous same measurement (`paths.routes.apiGeoJobDelta`) |

## Query

| Param | Required | Notes |
|-------|----------|-------|
| `previousId` | no | Explicit baseline id. When omitted, server picks the newest eligible previous run. |

## Response `200`

`ScanRunDeltaResult` (`@checkion-v3/contracts`):

```json
{
  "kind": "single",
  "currentId": "scan-single-2",
  "previousId": "scan-single-2-prior",
  "urlSet": ["https://www.durr-consulting.com/de"],
  "findings": {
    "new": [{ "key": "accessibility::color-contrast", "ruleId": "color-contrast", "title": "…", "severity": "serious" }],
    "gone": [],
    "same": []
  },
  "scores": [
    { "kind": "accessibility", "current": 72, "previous": 68, "delta": 4, "max": 100 }
  ]
}
```

GEO includes `"measurement": "recall" | "live"`.

## Errors

| Status | Body | When |
|--------|------|------|
| 200 | Delta | Baseline found / explicit previous eligible |
| 401 | `{ "error": "unauthorized" }` | Plexon auth configured, no session/Bearer |
| 403 | `{ "error": "forbidden" }` | Viewer cannot access the run |
| 404 | `{ "error": "not_found" }` | Unknown current id |
| 409 | `{ "error": "no_baseline" }` | No eligible previous run |
| 409 | `{ "error": "measurement_mismatch" }` | GEO `previousId` has a different measurement layer |
| 409 | `{ "error": "kind_mismatch" }` | Explicit previous is a different run kind / URL set |

## Auth
Same as other run reads: when Plexon auth is configured, require session / Bearer (`specs/api/tokens.md`). Service secret is not accepted.

## Spec
Domain: `specs/domain/scan-run-delta.md`
