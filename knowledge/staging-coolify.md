# Staging — Coolify ↔ plexon-v3

## Target

Deploy **checkion-v3** into Coolify island **msqdx-v3-staging** next to plexon-v3 / audion-v3.

| Item | Value |
|------|--------|
| Coolify project | `msqdx-ecosystem-v3` |
| Environment | `staging` |
| App name | `checkion-v3` (never touch prod CHECKION) |
| Domain | `https://checkion-v3.projects-a.plygrnd.tech` (`URL_CHECKION_V3`) |
| Dockerfile | repo root `Dockerfile` (pins `chbrdk/msqdx-ui` via `MSQDX_UI_REF`) |
| Container port | **3007** |
| Data mode | Fixtures by default (`CHECKION_FEDERATION_MODE=dummy`); optional Postgres via `DATABASE_URL` |
| Live scans | On when `DATABASE_URL` set or `CHECKION_LIVE_SCANS=1`; runner installs Puppeteer Chrome + OS deps |

Hierarchy and Wave B notes: `plexon-v3/knowledge/coolify-v3-staging-runbook.md`.

## Prerequisites

1. plexon-v3 staging healthy (`https://plexon-v3.projects-a.plygrnd.tech`)
2. GitHub repo for checkion-v3 on branch `main` (Coolify source)
3. Operator Coolify access (credentials not in-repo)

## Env (Coolify) — Staging Shell (fixtures)

```
NEXT_PUBLIC_CHECKION_URL=https://checkion-v3.projects-a.plygrnd.tech
NEXT_PLEXON_BASE_URL=https://plexon-v3.projects-a.plygrnd.tech
CHECKION_FEDERATION_MODE=dummy
PORT=3007
HOSTNAME=0.0.0.0
```

**Build-time vs runtime (Coolify UI tip):** mark secrets (`DATABASE_URL`, `AUTH_SECRET`, `OPENAI_API_KEY`, `PLEXON_AUTH_URL`, `PLEXON_SERVICE_SECRET`, …) as **runtime-only** — leave **“Available at Buildtime” unchecked**. Coolify otherwise injects `ARG`/`ENV` into the Dockerfile (`SecretsUsedInArgOrEnv` warnings) and `DATABASE_URL` makes Next SSG query Postgres during `npm run build` → deploy fails. The Dockerfile blanks those vars **only on the `npm run build` RUN** (not as image `ENV`), so the runner stage stays clean and Coolify container env is honored. Login + store pages use `dynamic = 'force-dynamic'` so auth flags are read at request time (not baked empty at compile).

**After redeploy, verify:** container has non-empty `PLEXON_AUTH_URL` + `PLEXON_SERVICE_SECRET` at runtime; `AUTH_SECRET` is ≥32 chars (entrypoint refuses to start when Plexon auth is set and secret is missing/short); open `/login` and confirm the sign-in form (not the “Plexon auth is not configured” fixture hint). Names are exact — no `NEXT_PUBLIC_` prefix on the auth URL/secret.

Optional Auth / DB / live federation:

```
PLEXON_AUTH_URL=https://plexon-v3.projects-a.plygrnd.tech
PLEXON_SERVICE_SECRET=<shared>
AUTH_SECRET=<≥32 chars>          # required by entrypoint when PLEXON_AUTH_URL + secret set
NEXT_PUBLIC_PLEXON_REGISTER_URL=https://plexon-v3.projects-a.plygrnd.tech/register
DATABASE_URL=postgres://…        # triggers drizzle-kit push on start; also enables live scans / GEO unless CHECKION_LIVE_*=0
CHECKION_LIVE_SCANS=1            # force live Puppeteer scans (even without DB — results stay in-memory)
CHECKION_LIVE_GEO=1              # force live GEO LLM pipeline (requires OPENAI_API_KEY)
OPENAI_API_KEY=sk-…              # required for live GEO stages + queryRuns
OPENAI_MODEL=gpt-5.4-nano        # optional
CHECKION_FEDERATION_MODE=live
PLEXON_DEMO_OWNER_USER_ID=…      # optional when no session on create
PLEXON_DEMO_COMPANY_ID=…
```

**Knowledge sync:** with `live` + secret, GEO suggest/create pulls the Collection pack; post-GEO CTA publishes `geo_context` / `competitive`. If `NEXT_PLEXON_BASE_URL` is omitted, runtime uses `PLEXON_AUTH_URL`. See `plexon-v3/knowledge/collection-knowledge-sync.md`.

### Chromium / Puppeteer

Live GEO stage1 / accessibility scans launch Puppeteer in-process. The multi-stage image must ship a **browser binary in the runner**, not only shared libraries:

1. **OS libs** on builder base + runner (`libnss3`, `libgbm1`, fonts, …) so headless Chrome can start.
2. **Chrome install in the runner:** `npx puppeteer browsers install chrome` into `PUPPETEER_CACHE_DIR=/opt/puppeteer` (cache is outside `node_modules`; a fresh `FROM` never inherits the builder’s `/root/.cache/puppeteer`).
3. Builder sets `PUPPETEER_SKIP_DOWNLOAD=true` so `npm ci` stays light; runner sets `PUPPETEER_SKIP_DOWNLOAD=false` and installs Chrome explicitly.

**Coolify:** redeploy after this Dockerfile lands — no extra browser env vars required. Do **not** set `PUPPETEER_SKIP_DOWNLOAD=true` as a Coolify build/runtime env (it can block the runner install layer if injected at build). Optional override: `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium` only if you switch the image to system Chromium instead of the bundled install. Live scans need enough RAM for headless Chrome (~512MB+ spare). Local fixture mode is unchanged (`CHECKION_LIVE_SCANS=0` / no `DATABASE_URL`).

### Scan screenshots (persistent volume)

Live WCAG captures write JPEGs under `SCAN_SCREENSHOTS_PATH` (image default: `/workspace/checkion-v3/data/screenshots`). **Mount a Coolify persistent volume** at that path so redeploys do not drop Issues-canvas screenshots.

```
SCAN_SCREENSHOTS_PATH=/workspace/checkion-v3/data/screenshots
```

Coolify → Application → **Persistent Storage** → mount host/volume path to `/workspace/checkion-v3/data/screenshots`.

## Coolify attach checklist

1. Project `msqdx-ecosystem-v3` → Environment `staging`
2. New Application `checkion-v3` — **not** the prod CHECKION app
3. Source: GitHub `checkion-v3`, branch `main`
4. Build: Dockerfile path `Dockerfile`, Base Directory `/`
5. Domains: `checkion-v3.projects-a.plygrnd.tech`
6. Ports: expose **3007**
7. Set env vars above → Deploy

### MCP companion app (live)

Coolify application `checkion-v3-mcp` in project **MSQDX-Checkion-v3** (uuid `fkwhbjlpy715henc7fcbwj2y`):

| Item | Value |
|------|--------|
| FQDN | `https://checkion-v3-mcp.projects-a.plygrnd.tech` (`URL_CHECKION_V3_MCP`) |
| Repo | `chbrdk/checkion-v3` · `main` |
| Dockerfile | `/Dockerfile` · base `/mcp-server` |
| Port | **3100** |
| Env | `CHECKION_API_URL=https://checkion-v3.projects-a.plygrnd.tech`, `CHECKION_API_TOKEN=<Settings token>`, `MCP_STATELESS=1` |

Operator: replace placeholder `CHECKION_API_TOKEN` with a Settings → API tokens Bearer, then redeploy. Spec: `specs/domain/mcp-server.md`.

## Smoke checklist

1. `GET https://checkion-v3.projects-a.plygrnd.tech/api/health` → ok + federation contract id
2. `GET …/api/federation/health` → contract present; `deferred: true` in dummy; live probes plexon
3. Browser: `/geo/geo-1/overview` and `/geo/geo-1/queries` (fixture magazine)
4. Optional: launch fixture scan from UI → result overview
5. Optional live GEO: set `CHECKION_LIVE_GEO=1` + `OPENAI_API_KEY` → `POST /api/geo-jobs` → open `/geo/<jobId>/overview`
6. Confirm **prod** `https://checkion.projects-a.plygrnd.tech` untouched
7. **Plexon registry (operator):** after smoke passes, set on **plexon-v3** Coolify:
   `NEXT_PUBLIC_CHECKION_URL=https://checkion-v3.projects-a.plygrnd.tech`
   (Wave B — point Collection / product links at checkion-v3, not prod CHECKION). Do not change Coolify from this repo.

## Local Docker smoke

```bash
docker build -t checkion-v3 .
docker run --rm -p 3007:3007 \
  -e NEXT_PUBLIC_CHECKION_URL=http://localhost:3007 \
  -e NEXT_PLEXON_BASE_URL=https://plexon-v3.projects-a.plygrnd.tech \
  -e CHECKION_FEDERATION_MODE=dummy \
  checkion-v3
```

## Status

Dockerfile + entrypoint + runbook ready. Live Coolify deploy requires GitHub remote + Coolify credentials (not in-repo). Phase 4 Collection surface: API tokens + richer provisioning GET (`geoJobCount` + catalogs) — see `knowledge/settings-api-tokens.md`.

Operator shortlist: [`coolify-operator-handoff.md`](./coolify-operator-handoff.md).
