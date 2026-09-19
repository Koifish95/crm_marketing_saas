FROM node:22-bookworm-slim AS deps
RUN corepack enable
WORKDIR /src
COPY pnpm-workspace.yaml package.json .npmrc pnpm-lock.yaml ./
COPY packages/crm-core/package.json ./packages/crm-core/
COPY martial_arts_template/package.json martial_arts_template/.npmrc ./martial_arts_template/
RUN pnpm install --frozen-lockfile --filter martial-arts-acquisition...

FROM node:22-bookworm-slim AS build
RUN corepack enable
WORKDIR /src
COPY --from=deps /src/node_modules ./node_modules
COPY --from=deps /src/martial_arts_template/node_modules ./martial_arts_template/node_modules
COPY packages/crm-core ./packages/crm-core
COPY martial_arts_template ./martial_arts_template
COPY pnpm-workspace.yaml package.json .npmrc ./
WORKDIR /src/martial_arts_template
RUN node docker/stub-missing-libsql-natives.mjs
# esbuild is a transitive Nuxt/Vite dep, not a top-level node_modules path.
# Bundle helpers before `pnpm build` so the workspace graph is still intact.
RUN pnpm exec esbuild docker/runtime-init.ts docker/db-marker.ts docker/backup-scheduler.ts docker/sqlite-snapshot.ts \
  --bundle \
  --platform=node \
  --format=cjs \
  --outdir=docker \
  --out-extension:.js=.cjs \
  --external:@libsql/linux-x64-gnu \
  --external:@libsql/linux-arm64-gnu \
  --external:@libsql/win32-x64-msvc \
  --external:@libsql/darwin-x64 \
  --external:@libsql/darwin-arm64
RUN pnpm build

FROM node:22-bookworm-slim AS runner
ARG RELEASE_ID=dev
RUN apt-get update \
  && apt-get install -y --no-install-recommends gosu \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=5000
ENV RELEASE_ID=${RELEASE_ID}
ENV DRIZZLE_MIGRATIONS_DIR=/app/drizzle/migrations
COPY --from=build /src/martial_arts_template/.output ./.output
COPY --from=build /src/martial_arts_template/drizzle/migrations ./drizzle/migrations
COPY --from=build /src/martial_arts_template/docker/runtime-init.cjs ./docker/runtime-init.cjs
COPY --from=build /src/martial_arts_template/docker/db-marker.cjs ./docker/db-marker.cjs
COPY --from=build /src/martial_arts_template/docker/backup-scheduler.cjs ./docker/backup-scheduler.cjs
COPY --from=build /src/martial_arts_template/docker/sqlite-snapshot.cjs ./docker/sqlite-snapshot.cjs
COPY martial_arts_template/docker/entrypoint.sh ./docker/entrypoint.sh
# Workspace-root @libsql — package-level node_modules/@libsql is often only the
# stub natives written so Nitro can trace other OS bindings.
COPY --from=build /src/node_modules/@libsql ./node_modules/@libsql
# Empty data dirs only. Never COPY a sqlite file into the image.
RUN sed -i 's/\r$//' docker/entrypoint.sh \
  && chmod +x docker/entrypoint.sh \
  && mkdir -p /app/data/sqlite /app/data/uploads \
  && chown -R node:node /app/data /app/docker
EXPOSE 5000
HEALTHCHECK --interval=15s --timeout=5s --start-period=40s --retries=5 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:5000/api/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"]
ENTRYPOINT ["docker/entrypoint.sh"]
