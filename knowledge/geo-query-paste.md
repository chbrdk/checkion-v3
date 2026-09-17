# GEO query smart paste

**Date:** 2026-09-17  
**Spec:** `specs/domain/scan-modes.md` § GEO query list  
**Code:** `apps/web/lib/geo-query-paste.ts` · `GeoQueryList`

## Behaviour
Paste a list of prompts into Queries (CTA **Paste**, or ⌘V / Ctrl+V on the list / while editing):

| Clipboard shape | Result |
|-----------------|--------|
| Newline list (`01 …`, `1. …`, `- …`) | One row per line; markers stripped |
| One line with ≥2 `?` | Split on `?` boundaries |
| Single line / single prompt | Native paste (no list map) |
| Empty list | Replace with pasted prompts |
| Filled list | Merge + dedupe (cap 24) |
