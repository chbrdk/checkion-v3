# Coolify operator handoff — checkion-v3 Staging Shell

Repo-side work for this slice is done (Dockerfile clones `msqdx-ui`, docs, packaging test).

## You do next (Coolify + GitHub)

1. **GitHub:** Create `checkion-v3` remote (if missing), then ask the agent to **commit + push** (not done automatically — needs your OK).
2. Coolify → Project `msqdx-ecosystem-v3` → Env `staging` → New app **`checkion-v3`**
3. Source: that repo / `main` · Dockerfile `Dockerfile` · Base `/`
4. Domain: `checkion-v3.projects-a.plygrnd.tech` · Port **3007**
5. Env:
   ```
   NEXT_PUBLIC_CHECKION_URL=https://checkion-v3.projects-a.plygrnd.tech
   NEXT_PLEXON_BASE_URL=https://plexon-v3.projects-a.plygrnd.tech
   CHECKION_FEDERATION_MODE=dummy
   PORT=3007
   HOSTNAME=0.0.0.0
   ```
6. Deploy → smoke URLs in `knowledge/staging-coolify.md`
7. Confirm prod `https://checkion.projects-a.plygrnd.tech` unchanged

Full checklist: [knowledge/staging-coolify.md](./staging-coolify.md)

## Smoke (after DNS/app live)

```bash
curl -sS https://checkion-v3.projects-a.plygrnd.tech/api/health
curl -sS https://checkion-v3.projects-a.plygrnd.tech/api/federation/health
# Browser: /geo/geo-1/overview · /geo/geo-1/queries
```

Until the app is attached, staging smokes will fail (expected).
