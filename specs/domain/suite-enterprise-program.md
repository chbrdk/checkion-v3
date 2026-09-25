# CHECKION — Suite Enterprise Program

**Status:** Accepted (program) — 2026-09-25. E2 slot publish client landed (`plexon-client-room` + `POST /api/projects/:id/client-room/publish`); E3 Gegentest delta APIs landed; E4/E1 Plexon-Clients (`plexon-suite-audit`, `plexon-collection-activity`) feuern bei GEO-Job `completed` (Audit nur mit Session-Actor). Magazine chrome und Flow `retest` remain open.  
**Programm:** `plexon-v3/specs/domain/suite-enterprise-program.md`  
**Federation:** `2026-05-plexon-federation-v3`

## Pflicht

| Welle | CHECKION liefert |
|---|---|
| E1 | Destillat des letzten Single-, Domain- und GEO-Laufs für das Collection-Lagebild (Art, Status, Zeit, Deep-Link). |
| E2 | Ein freigegebener Overview-Stand als Slot `checkion_overview`. Freigabe ist explizit, nicht „Lauf fertig“. |
| E3 | Vergleich Lauf gegen Vorlauf derselben Art und URL-Menge: neu, weg, gleich, Score-Delta. GEO nur innerhalb derselben Mess-Schicht. `retest` ohne Vorlauf ist ein Fehler. Spec: `scan-run-delta.md`. |
| E4 | Audit-Ereignis `run_started` / `run_finished` mit `actorUserId`. |
| E5 | Quality-Gate liest den bestehenden Score. Kein zweites Scoring. |
| E7 | Seiten-Referenzen lesbar für den Kampagnenbrief. |
| E8 | Single-Scan der Statement-URL aus der Krisenvorlage, gleicher Weg wie `audion-journey-scan-trigger.md`. |

## Annahme

- Reports-Magazin (`project-reports.md`) bleibt Platzhalter, bis E3 das Delta in den bestehenden Ergebnis-Magazinen zeigt. Ein zweites Report-Produkt entsteht hier nicht.
- Model memory und Live search bleiben getrennte Jobs.

## Acceptance

Ein Gegentest auf einer Domain zeigt das Delta im Domain-Magazin und als Katalogfeld für den Flow. Ein GEO-Delta mischt die Schichten nicht.
