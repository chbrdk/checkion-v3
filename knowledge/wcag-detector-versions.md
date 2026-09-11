# WCAG detector library versions (CHECKION)

Checked **2026-09-11**. Scanner stack: Pa11y + direct `axe-core` injection for passed audits (`apps/web/lib/scan/scanner.ts`).

## Current pins (`apps/web/package.json`)

| Package | Pin | Role |
|---------|-----|------|
| `axe-core` | `^4.13.0` | Direct inject (`axe.min.js`) for passed audits + shared rule docs |
| `pa11y` | `^10.0.0` | WCAG runners (`axe` + `htmlcs`); ships nested `axe-core` `~4.13.0` |
| `puppeteer` | `^25.10.0` | Browser for scans; aligned with Pa11y 10 (requires Node `^22.13 \|\| >=24`) |
| `@pa11y/html_codesniffer` | via pa11y (`^2.6.0`) | htmlcs runner |

## Canonical docs URLs

- Axe rule help: `paths.remediationAxeRulesBase` → `https://dequeuniversity.com/rules/axe/4.13`
- WCAG quickref: `paths.remediationWcagQuickref` → `https://www.w3.org/WAI/WCAG21/quickref/`
- Implementation: `apps/web/lib/scan/remediation-urls.ts`
- Rule → level map: `apps/web/lib/scan/axe-wcag-levels.ts` (keep in sync when upgrading axe)

## Upgrade notes

1. Bump `axe-core`, then set `paths.remediationAxeRulesBase` to the matching Deque `major.minor`.
2. Prefer upgrading `pa11y` in the same change so nested axe stays aligned (avoids dual axe versions for issues vs passes).
3. Pa11y 10+ needs even Node **22.13+** (Docker: `node:22-bookworm-slim` is fine).
4. Puppeteer 25+ needs OS **`unzip`** in the Docker runner (see root `Dockerfile`) or Chrome install fails.
5. Re-run `apps/web/__tests__/remediation-urls.test.ts` and a live WCAG smoke scan after bumps.

## History

- **2026-09-11:** `axe-core` 4.12.1 → 4.13.0; `pa11y` 9.1.1 → 10.0.0; `puppeteer` 24 → 25.10; Deque docs 4.10 → 4.13; added `no-autoplay-audio` to level map.
