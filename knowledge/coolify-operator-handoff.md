# Coolify operator handoff — checkion-v3 Staging Shell

Repo-side work for this slice is done (Dockerfile clones `msqdx-ui`, docs, packaging test).

**GitHub:** https://github.com/chbrdk/checkion-v3 (`main` pushed)

## You do next (Coolify)

1. Coolify → Project `msqdx-ecosystem-v3` → Env `staging` → New app **`checkion-v3`**
2. Source: `chbrdk/checkion-v3` / `main` · Dockerfile `Dockerfile` · Base `/`
3. Domain: `checkion-v3.projects-a.plygrnd.tech` · Port **3007**
4. Env:
   ```
   NEXT_PUBLIC_CHECKION_URL=https://checkion-v3.projects-a.plygrnd.tech
   NEXT_PLEXON_BASE_URL=https://plexon-v3.projects-a.plygrnd.tech
   CHECKION_FEDERATION_MODE=dummy
   PORT=3007
   HOSTNAME=0.0.0.0
   ```
5. Deploy → smoke URLs in `knowledge/staging-coolify.md`
6. Confirm prod `https://checkion.projects-a.plygrnd.tech` unchanged
7. **After smoke:** on **plexon-v3** Coolify set `NEXT_PUBLIC_CHECKION_URL=https://checkion-v3.projects-a.plygrnd.tech` (Wave B registry → v3)

Full checklist: [knowledge/staging-coolify.md](./staging-coolify.md)

## Smoke (after DNS/app live)

```bash
curl -sS https://checkion-v3.projects-a.plygrnd.tech/api/health
curl -sS https://checkion-v3.projects-a.plygrnd.tech/api/federation/health
# Browser: /geo/geo-1/overview · /geo/geo-1/queries
```

Until the app is attached, staging smokes will fail (expected).
