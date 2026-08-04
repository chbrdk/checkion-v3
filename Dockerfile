# CHECKION v3 – Docker image for Coolify / self-hosted.
# Context: repository root (checkion-v3).
# Build:  docker build -t checkion-v3 .
# Run:    docker run -p 3007:3007 \
#           -e NEXT_PUBLIC_CHECKION_URL=… \
#           -e NEXT_PLEXON_BASE_URL=… \
#           -e CHECKION_FEDERATION_MODE=dummy \
#           checkion-v3
#
# Sibling design system: fetches github.com/chbrdk/msqdx-ui at MSQDX_UI_REF next
# to the app so file: deps, webpack aliases (`../../../msqdx-ui/…`), and barrels resolve.
# Coolify: Dockerfile path `Dockerfile`, domain https://checkion-v3.projects-a.plygrnd.tech
# (see knowledge/staging-coolify.md). Fixture mode needs no AUTH/DB; live auth+DB via entrypoint.

ARG NODE_IMAGE=node:22-bookworm-slim

# ---- Base ----
# Chromium OS deps for Puppeteer-bundled Chrome (live scans). Coolify may use a
# browser-capable base instead; keep these packages when staying on node slim.
# Browser binary itself is installed in the **runner** stage (cache is not in
# node_modules; a fresh FROM would otherwise miss /root/.cache/puppeteer).
FROM ${NODE_IMAGE} AS base
WORKDIR /workspace
ENV NEXT_TELEMETRY_DISABLED=1
# Skip Chrome during npm ci — build does not launch scanners; runner installs it.
ENV PUPPETEER_SKIP_DOWNLOAD=true
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libx11-6 \
    libxcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    wget \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/* \
    && corepack enable

# ---- Design system (msqdx-ui) ----
# Pin a commit (not floating `main`) so Coolify/Docker cannot reuse a stale `ds`
# layer that predates barrel targets like CardActions / Lede — that surfaces as:
#   ./lib/msqdx-ui.ts Module not found: …/components/CardActions
# Bump MSQDX_UI_REF whenever checkion barrels need a newer primitive from chbrdk/msqdx-ui.
FROM base AS ds
ARG MSQDX_UI_REPO=https://github.com/chbrdk/msqdx-ui.git
ARG MSQDX_UI_REF=621fda38822165c6edfce0f337f937ecf3e5863c
RUN git init /workspace/msqdx-ui \
    && cd /workspace/msqdx-ui \
    && git remote add origin "${MSQDX_UI_REPO}" \
    && git fetch --depth 1 origin "${MSQDX_UI_REF}" \
    && git checkout --force FETCH_HEAD \
    && test "$(git rev-parse HEAD)" = "${MSQDX_UI_REF}" \
    && pnpm install --frozen-lockfile \
    && pnpm build

# ---- Builder ----
FROM base AS builder
ENV NODE_ENV=development
COPY --from=ds /workspace/msqdx-ui /workspace/msqdx-ui
COPY . /workspace/checkion-v3
WORKDIR /workspace/checkion-v3

# --include=dev: Coolify may inject NODE_ENV=production as a build ARG before this
# stage; without it, typescript/devDeps are omitted and `next build` fails.
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund --include=dev

# Sibling layout: …/workspace/checkion-v3 + …/workspace/msqdx-ui
# Assert barrel source targets exist (RSC alias re-exports deep src paths, not package dist).
RUN test -d /workspace/msqdx-ui/packages/ui/src \
    && test -f /workspace/msqdx-ui/packages/ui-tokens/dist/index.js \
    && test -f /workspace/msqdx-ui/packages/ui/src/components/CardActions.tsx \
    && test -f /workspace/msqdx-ui/packages/ui/src/components/Lede.tsx \
    && test -f /workspace/msqdx-ui/packages/ui/src/components/InfoTip.tsx \
    && grep -q "export { CardActions }" /workspace/msqdx-ui/packages/ui/src/index.ts \
    && grep -q "export { InfoTip }" /workspace/msqdx-ui/packages/ui/src/index.ts

ENV NODE_ENV=production
ENV NODE_OPTIONS=--max-old-space-size=6144
# Coolify often marks app secrets "available at buildtime" (SecretsUsedInArgOrEnv).
# DATABASE_URL during `next build` makes SSG pages query Postgres → ECONNREFUSED → exit 1.
# Blank ONLY for this RUN (do not ENV= into the image layer — runner is a fresh FROM, but
# empty ENV instructions can confuse Coolify / image inspect; Coolify runtime -e must win).
RUN DATABASE_URL= \
    OPENAI_API_KEY= \
    PLEXON_SERVICE_SECRET= \
    PLEXON_AUTH_URL= \
    AUTH_SECRET= \
    npm run build

# ---- Runner ----
# Fresh base image — no builder ENV. Runtime secrets come from Coolify container env only.
FROM ${NODE_IMAGE} AS runner
WORKDIR /workspace/checkion-v3

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3007
ENV HOSTNAME=0.0.0.0
ENV CHECKION_FEDERATION_MODE=dummy
# Live scans need the browser binary in this stage (not only OS libs / builder cache).
ENV PUPPETEER_SKIP_DOWNLOAD=false
ENV PUPPETEER_CACHE_DIR=/opt/puppeteer
EXPOSE 3007

# Puppeteer OS libraries (same set as builder base) for live scans.
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libx11-6 \
    libxcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    wget \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /workspace/checkion-v3/package.json ./package.json
COPY --from=builder /workspace/checkion-v3/package-lock.json ./package-lock.json
COPY --from=builder /workspace/checkion-v3/node_modules ./node_modules
COPY --from=builder /workspace/checkion-v3/packages ./packages
COPY --from=builder /workspace/checkion-v3/apps/web/package.json ./apps/web/package.json
COPY --from=builder /workspace/checkion-v3/apps/web/.next ./apps/web/.next
COPY --from=builder /workspace/checkion-v3/apps/web/next.config.ts ./apps/web/next.config.ts
COPY --from=builder /workspace/checkion-v3/apps/web/tsconfig.json ./apps/web/tsconfig.json
# Runtime webpack / barrel aliases still resolve into msqdx-ui source (SSR).
COPY --from=builder /workspace/msqdx-ui /workspace/msqdx-ui

# Optional public assets if present
COPY --from=builder /workspace/checkion-v3/apps/web/public ./apps/web/public
COPY --from=builder /workspace/checkion-v3/apps/web/drizzle.config.ts ./apps/web/drizzle.config.ts
COPY --from=builder /workspace/checkion-v3/apps/web/lib/db ./apps/web/lib/db
COPY --from=builder /workspace/checkion-v3/scripts ./scripts

# Chrome revision matching the installed puppeteer package (GEO stage1 / live scans).
# Must run in the runner — Puppeteer cache is outside node_modules and is lost on fresh FROM.
RUN npx --yes puppeteer browsers install chrome \
    && test -d "${PUPPETEER_CACHE_DIR}"

RUN chmod +x ./scripts/docker-entrypoint.sh ./scripts/check-database-url.mjs

WORKDIR /workspace/checkion-v3
CMD ["./scripts/docker-entrypoint.sh"]
