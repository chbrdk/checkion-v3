# CHECKION v3 scan-worker — Puppeteer claim loop (no Next.js).
# Coolify: Dockerfile path `services/scan-worker/Dockerfile`, port 3011.
# Context: repository root (checkion-v3).
# @see specs/domain/scan-worker.md · knowledge/staging-coolify-scan-worker.md

ARG NODE_IMAGE=node:22-bookworm-slim

FROM ${NODE_IMAGE} AS base
WORKDIR /workspace
ENV NEXT_TELEMETRY_DISABLED=1
ENV PUPPETEER_SKIP_DOWNLOAD=true
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    unzip \
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

FROM base AS builder
WORKDIR /workspace/checkion-v3
COPY package.json package-lock.json ./
COPY packages ./packages
COPY apps/web/package.json ./apps/web/package.json
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund --include=dev
COPY apps/web ./apps/web
COPY packages ./packages

FROM ${NODE_IMAGE} AS runner
WORKDIR /workspace/checkion-v3

ENV NODE_ENV=production
ENV PORT=3011
ENV HOSTNAME=0.0.0.0
ENV PUPPETEER_SKIP_DOWNLOAD=false
ENV PUPPETEER_CACHE_DIR=/opt/puppeteer
ENV SCAN_SCREENSHOTS_PATH=/workspace/checkion-v3/data/screenshots
ENV CHECKION_LIVE_SCANS=1
# Worker is isolated from Next.js — allow parallel pages on one Chromium.
ENV DOMAIN_SCAN_CONCURRENCY=5
ENV DOMAIN_SCAN_DELAY_MS=200
EXPOSE 3011

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    unzip \
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
COPY --from=builder /workspace/checkion-v3/apps/web ./apps/web

RUN npx --yes puppeteer browsers install chrome \
    && test -d "${PUPPETEER_CACHE_DIR}" \
    && mkdir -p "${SCAN_SCREENSHOTS_PATH}"

WORKDIR /workspace/checkion-v3/apps/web
CMD ["npm", "run", "scan-worker"]
