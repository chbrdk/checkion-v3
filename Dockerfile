# CHECKION v3 – Docker image for Coolify / self-hosted.
# Context: repository root (checkion-v3).
# Build:  docker build -t checkion-v3 .
# Run:    docker run -p 3007:3007 \
#           -e NEXT_PUBLIC_CHECKION_URL=… \
#           -e NEXT_PLEXON_BASE_URL=… \
#           -e CHECKION_FEDERATION_MODE=dummy \
#           checkion-v3
#
# Sibling design system: clones github.com/chbrdk/msqdx-ui next to the app
# so file: deps, webpack aliases (`../../../msqdx-ui/…`), and barrels resolve.
# Coolify: Dockerfile path `Dockerfile`, domain https://checkion-v3.projects-a.plygrnd.tech
# (see knowledge/staging-coolify.md). Staging shell = fixtures only; no Auth/DB required.

ARG NODE_IMAGE=node:22-bookworm-slim

# ---- Base ----
FROM ${NODE_IMAGE} AS base
WORKDIR /workspace
ENV NEXT_TELEMETRY_DISABLED=1
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && corepack enable

# ---- Design system (msqdx-ui) ----
FROM base AS ds
ARG MSQDX_UI_REPO=https://github.com/chbrdk/msqdx-ui.git
ARG MSQDX_UI_BRANCH=main
RUN git clone --depth 1 -b "${MSQDX_UI_BRANCH}" "${MSQDX_UI_REPO}" /workspace/msqdx-ui \
    && cd /workspace/msqdx-ui \
    && pnpm install --frozen-lockfile \
    && pnpm build

# ---- Builder ----
FROM base AS builder
ENV NODE_ENV=development
COPY --from=ds /workspace/msqdx-ui /workspace/msqdx-ui
COPY . /workspace/checkion-v3
WORKDIR /workspace/checkion-v3

RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund

# Sibling layout: …/workspace/checkion-v3 + …/workspace/msqdx-ui
RUN test -d /workspace/msqdx-ui/packages/ui/src \
    && test -f /workspace/msqdx-ui/packages/ui-tokens/dist/index.js

ENV NODE_ENV=production
ENV NODE_OPTIONS=--max-old-space-size=6144
RUN npm run build

# ---- Runner ----
FROM ${NODE_IMAGE} AS runner
WORKDIR /workspace/checkion-v3

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3007
ENV HOSTNAME=0.0.0.0
ENV CHECKION_FEDERATION_MODE=dummy
EXPOSE 3007

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

WORKDIR /workspace/checkion-v3
CMD ["npm", "run", "start", "-w", "web"]
