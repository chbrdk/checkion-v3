# Staging — Coolify ↔ plexon-v3

## Target

Deploy **checkion-v3** into Coolify island **msqdx-v3-staging** next to plexon-v3 / audion-v3.

| Item | Value |
|------|--------|
| Coolify project | `msqdx-ecosystem-v3` |
| Environment | `staging` |
| App name | `checkion-v3` (never touch prod CHECKION) |
| Domain | `https://checkion-v3.projects-a.plygrnd.tech` (`URL_CHECKION_V3`) |
| Dockerfile | repo root `Dockerfile` (clones `chbrdk/msqdx-ui`) |
| Container port | **3007** |
| Data mode | In-memory fixtures (`CHECKION_FEDERATION_MODE=dummy`) |

Hierarchy and Wave B notes: `plexon-v3/knowledge/coolify-v3-staging-runbook.md`.

## Prerequisites

1. plexon-v3 staging healthy (`https://plexon-v3.projects-a.plygrnd.tech`)
2. GitHub repo for checkion-v3 on branch `main` (Coolify source)
3. Operator Coolify access (credentials not in-repo)

## Env (Coolify)

```
NEXT_PUBLIC_CHECKION_URL=https://checkion-v3.projects-a.plygrnd.tech
NEXT_PLEXON_BASE_URL=https://plexon-v3.projects-a.plygrnd.tech
CHECKION_FEDERATION_MODE=dummy
PORT=3007
HOSTNAME=0.0.0.0
```

Not required for Staging Shell (fixtures):

- `PLEXON_SERVICE_SECRET` (Federation live = later slice)
- `AUTH_SECRET` / NextAuth (Auth = later slice)
- `DATABASE_URL` (no product Postgres yet)

## Coolify attach checklist

1. Project `msqdx-ecosystem-v3` → Environment `staging`
2. New Application `checkion-v3` — **not** the prod CHECKION app
3. Source: GitHub `checkion-v3`, branch `main`
4. Build: Dockerfile path `Dockerfile`, Base Directory `/`
5. Domains: `checkion-v3.projects-a.plygrnd.tech`
6. Ports: expose **3007**
7. Set env vars above → Deploy

## Smoke checklist

1. `GET https://checkion-v3.projects-a.plygrnd.tech/api/health` → ok + federation contract id
2. `GET …/api/federation/health` → contract present; plexonReachable may be false while mode=`dummy`
3. Browser: `/geo/geo-1/overview` and `/geo/geo-1/queries` (fixture magazine)
4. Optional: launch fixture scan from UI → result overview
5. Confirm **prod** `https://checkion.projects-a.plygrnd.tech` untouched

## Local Docker smoke

```bash
docker build -t checkion-v3 .
docker run --rm -p 3007:3007 \
  -e NEXT_PUBLIC_CHECKION_URL=http://localhost:3007 \
  -e NEXT_PLEXON_BASE_URL=https://plexon-v3.projects-a.plygrnd.tech \
  -e CHECKION_FEDERATION_MODE=dummy \
  checkion-v3
```

## Out of scope (later slices)

- NextAuth / login against plexon-v3
- `CHECKION_FEDERATION_MODE=live` + project origin
- Product Postgres
- Live GEO / crawl workers
- Switching plexon registry from prod CHECKION URL to v3

## Status

Dockerfile + runbook ready for operator attach. Live Coolify deploy requires GitHub remote + Coolify credentials (not in-repo).

Operator shortlist: [`coolify-operator-handoff.md`](./coolify-operator-handoff.md).
