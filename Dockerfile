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
COPY packages/shared/package.json packages/shared/package.json
COPY packages/ts-config/package.json packages/ts-config/package.json

RUN pnpm install --frozen-lockfile

FROM deps AS builder

COPY . .

ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
ARG NEXT_PUBLIC_SIGNING_BASE_URL=
ARG NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID=
ARG NEXT_PUBLIC_GOOGLE_PICKER_API_KEY=
ARG NEXT_PUBLIC_GOOGLE_PICKER_APP_ID=

ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_SIGNING_BASE_URL=$NEXT_PUBLIC_SIGNING_BASE_URL
ENV NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID=$NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID
ENV NEXT_PUBLIC_GOOGLE_PICKER_API_KEY=$NEXT_PUBLIC_GOOGLE_PICKER_API_KEY
ENV NEXT_PUBLIC_GOOGLE_PICKER_APP_ID=$NEXT_PUBLIC_GOOGLE_PICKER_APP_ID

RUN pnpm build

FROM base AS runner

ENV NODE_ENV=production
ENV BACKEND_PORT=3001
ENV FRONTEND_PORT=3000
ENV HOSTNAME=0.0.0.0
ENV SQLITE_DATABASE_PATH=/data/signa.sqlite
ENV STORAGE_PATH=/storage

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates libreoffice poppler-utils fonts-dejavu fonts-liberation \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app ./

RUN chmod +x /app/docker/entrypoint.sh \
  && mkdir -p /data /storage

VOLUME ["/data", "/storage"]

EXPOSE 3000 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.BACKEND_PORT || process.env.PORT || 3001) + '/api/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

ENTRYPOINT ["/app/docker/entrypoint.sh"]
