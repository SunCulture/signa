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

ENV NEXT_PUBLIC_API_BASE_URL=

RUN pnpm build

FROM base AS runner

ENV NODE_ENV=production
ENV PORT=3001
ENV DATABASE_TYPE=sqlite
ENV SQLITE_DATABASE_PATH=/app/data/signa.sqlite
ENV STORAGE_PATH=/app/storage

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates libreoffice fonts-dejavu fonts-liberation \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app ./

RUN mkdir -p /app/data /app/storage

VOLUME ["/app/data", "/app/storage"]

EXPOSE 3001

CMD ["pnpm", "--filter", "backend", "start:prod"]
