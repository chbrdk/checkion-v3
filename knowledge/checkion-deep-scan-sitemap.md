# Deep-scan sitemap discovery (CHECKION)

**Companion to:** `apps/web/lib/scan/sitemap.ts` · Spec: `specs/domain/scan-crawl-assets.md`

## Behavior (summary)

- Discover sitemap via `robots.txt` or well-known URLs (`/sitemap.xml`, …).
- Parse XML; collect same-site URLs with a capped index-child follow.
- Treat www vs apex as the same site for filtering.

Full crawl/asset policy lives in the domain spec; this note exists so `@see` from `sitemap.ts` resolves in-repo.
