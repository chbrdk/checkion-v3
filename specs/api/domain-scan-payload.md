# API — Domain scan payload architecture

## Status
Accepted (tech)

## Problem (v2)
Large domain JSON + fragile hydrate.

## v3 rules
1. **Light summary** endpoint for overview (scores + top issues + pageCount)
2. **Issues** paginated/grouped — never full dump on first paint
3. Heavy SEO/infra payloads **lazy per section** (deferred sections)
4. Clients must not assume a single mega document
