# syntax=docker/dockerfile:1.7
# Build from the repository root: docker build -f apps/api/Dockerfile .
ARG NODE_VERSION=24

FROM node:${NODE_VERSION}-slim AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH COREPACK_ENABLE_DOWNLOAD_PROMPT=0 CI=1
RUN corepack enable
WORKDIR /repo

FROM base AS build
# Dependency layer first so source changes do not invalidate it.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store pnpm fetch
COPY . .
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store pnpm install --frozen-lockfile --offline
RUN pnpm turbo run build --filter=@anytools/api
# Self-contained production bundle: the app plus its runtime deps (workspace packages included).
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store pnpm --filter=@anytools/api deploy --prod /out

FROM node:${NODE_VERSION}-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
# Shared volume for the local storage driver (owned by the unprivileged user).
RUN mkdir -p /data/storage && chown node:node /data/storage
COPY --from=build --chown=node:node /out ./
USER node
EXPOSE 4000
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:'+(process.env.PORT||4000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
# Migrations (run as a pre-deploy step): node node_modules/@anytools/db/dist/migrate.js
CMD ["node", "dist/index.js"]
