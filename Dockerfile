# syntax=docker/dockerfile:1.7

FROM node:24-bookworm-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

WORKDIR /app

FROM base AS deps

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates python3 make g++ pkg-config \
  && rm -rf /var/lib/apt/lists/*

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json
COPY packages/signa-react/package.json packages/signa-react/package.json
COPY packages/signa-react-native/package.json packages/signa-react-native/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/ts-config/package.json packages/ts-config/package.json

RUN --mount=type=cache,id=signa-pnpm-store,target=/pnpm/store \
  pnpm config set store-dir /pnpm/store \
  && pnpm install --frozen-lockfile

FROM deps AS builder

COPY . .

ARG NEXT_PUBLIC_API_BASE_URL=https://api.esignin.sunculture.io
ARG NEXT_PUBLIC_SIGNING_BASE_URL=https://esignin.sunculture.io
ARG NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID=
ARG NEXT_PUBLIC_GOOGLE_PICKER_API_KEY=
ARG NEXT_PUBLIC_GOOGLE_PICKER_APP_ID=
ARG APP_VERSION=0.1.0
ARG APP_COMMIT_SHA=
ARG APP_BUILD_TIME=

ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_SIGNING_BASE_URL=$NEXT_PUBLIC_SIGNING_BASE_URL
ENV NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID=$NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID
ENV NEXT_PUBLIC_GOOGLE_PICKER_API_KEY=$NEXT_PUBLIC_GOOGLE_PICKER_API_KEY
ENV NEXT_PUBLIC_GOOGLE_PICKER_APP_ID=$NEXT_PUBLIC_GOOGLE_PICKER_APP_ID
ENV APP_VERSION=$APP_VERSION
ENV APP_COMMIT_SHA=$APP_COMMIT_SHA
ENV APP_BUILD_TIME=$APP_BUILD_TIME

RUN test -n "$NEXT_PUBLIC_API_BASE_URL" \
  && pnpm build \
  && rm -rf apps/frontend/.next/cache

FROM base AS production-deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json
COPY packages/signa-react/package.json packages/signa-react/package.json
COPY packages/signa-react-native/package.json packages/signa-react-native/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/ts-config/package.json packages/ts-config/package.json

RUN --mount=type=cache,id=signa-pnpm-store,target=/pnpm/store \
  pnpm config set store-dir /pnpm/store \
  && pnpm install --prod --frozen-lockfile

FROM base AS runner

ARG APP_VERSION=0.1.0
ARG APP_COMMIT_SHA=
ARG APP_BUILD_TIME=

ENV NODE_ENV=production
ENV BACKEND_PORT=3001
ENV FRONTEND_PORT=3000
ENV HOSTNAME=0.0.0.0
ENV SQLITE_DATABASE_PATH=/data/signa.sqlite
ENV STORAGE_PATH=/storage
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
ENV NODE_EXTRA_CA_CERTS=/etc/ssl/certs/rds-global-bundle.pem
ENV APP_VERSION=$APP_VERSION
ENV APP_COMMIT_SHA=$APP_COMMIT_SHA
ENV APP_BUILD_TIME=$APP_BUILD_TIME

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ca-certificates \
    libreoffice-writer \
    poppler-utils \
    fonts-dejavu \
    fonts-liberation \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY docker/certs/rds-global-bundle.pem /etc/ssl/certs/rds-global-bundle.pem

COPY --from=production-deps /app/node_modules ./node_modules
COPY --from=production-deps /app/apps/backend/node_modules ./apps/backend/node_modules
COPY --from=production-deps /app/apps/frontend/node_modules ./apps/frontend/node_modules
COPY --from=production-deps /app/packages/shared ./packages/shared

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/apps/backend/package.json ./apps/backend/package.json
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/apps/frontend/package.json ./apps/frontend/package.json
COPY --from=builder /app/apps/frontend/next.config.ts ./apps/frontend/next.config.ts
COPY --from=builder /app/apps/frontend/.next ./apps/frontend/.next
COPY --from=builder /app/apps/frontend/public ./apps/frontend/public
COPY --from=builder /app/packages/shared/src ./packages/shared/src
COPY --from=builder /app/docker/entrypoint.sh ./docker/entrypoint.sh
COPY --from=builder /app/docker/runner.mjs ./docker/runner.mjs

RUN /app/apps/backend/node_modules/.bin/playwright install --with-deps chromium \
  && chmod +x /app/docker/entrypoint.sh \
  && mkdir -p /data /storage

VOLUME ["/data", "/storage"]

EXPOSE 3000 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.BACKEND_PORT || process.env.PORT || 3001) + '/api/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

ENTRYPOINT ["/app/docker/entrypoint.sh"]
