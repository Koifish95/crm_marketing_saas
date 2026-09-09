FROM node:22-bookworm-slim AS deps
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm install --frozen-lockfile

FROM node:22-bookworm-slim AS build
RUN corepack enable
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN node docker/stub-missing-libsql-natives.mjs
RUN pnpm build
RUN node node_modules/esbuild/bin/esbuild docker/runtime-init.ts \
  --bundle \
  --platform=node \
  --format=cjs \
  --outfile=docker/runtime-init.cjs \
  --external:@libsql/linux-x64-gnu \
  --external:@libsql/linux-arm64-gnu \
  --external:@libsql/win32-x64-msvc \
  --external:@libsql/darwin-x64 \
  --external:@libsql/darwin-arm64
RUN node node_modules/esbuild/bin/esbuild docker/db-marker.ts \
  --bundle \
  --platform=node \
  --format=cjs \
  --outfile=docker/db-marker.cjs \
  --external:@libsql/linux-x64-gnu \
  --external:@libsql/linux-arm64-gnu \
  --external:@libsql/win32-x64-msvc \
  --external:@libsql/darwin-x64 \
  --external:@libsql/darwin-arm64
RUN node node_modules/esbuild/bin/esbuild docker/backup-scheduler.ts \
  --bundle \
  --platform=node \
  --format=cjs \
  --outfile=docker/backup-scheduler.cjs \
  --external:@libsql/linux-x64-gnu \
  --external:@libsql/linux-arm64-gnu \
  --external:@libsql/win32-x64-msvc \
  --external:@libsql/darwin-x64 \
  --external:@libsql/darwin-arm64

FROM node:22-bookworm-slim AS runner
RUN apt-get update \
  && apt-get install -y --no-install-recommends gosu \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=5000
ENV DRIZZLE_MIGRATIONS_DIR=/app/drizzle/migrations
COPY --from=build /app/.output ./.output
COPY --from=build /app/drizzle/migrations ./drizzle/migrations
COPY --from=build /app/docker/runtime-init.cjs ./docker/runtime-init.cjs
COPY --from=build /app/docker/db-marker.cjs ./docker/db-marker.cjs
COPY --from=build /app/docker/backup-scheduler.cjs ./docker/backup-scheduler.cjs
COPY docker/entrypoint.sh ./docker/entrypoint.sh
COPY --from=build /app/node_modules/@libsql ./node_modules/@libsql
# Empty data dirs only. Never COPY a sqlite file into the image.
# Live PRODUCTION on Koi-Pi is the named volume webhosting_renzo_sqlite.
RUN chmod +x docker/entrypoint.sh \
  && mkdir -p /app/data/sqlite /app/data/uploads \
  && chown -R node:node /app/data /app/docker
EXPOSE 5000
HEALTHCHECK --interval=15s --timeout=5s --start-period=40s --retries=5 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:5000/api/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"]
ENTRYPOINT ["docker/entrypoint.sh"]
