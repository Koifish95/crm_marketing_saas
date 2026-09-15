FROM node:22-bookworm-slim AS deps
RUN corepack enable
WORKDIR /src
COPY pnpm-workspace.yaml package.json .npmrc pnpm-lock.yaml ./
COPY packages/crm-core/package.json ./packages/crm-core/
COPY sales_template/package.json sales_template/.npmrc ./sales_template/
RUN pnpm install --frozen-lockfile --filter sales-crm...

FROM node:22-bookworm-slim AS build
RUN corepack enable
WORKDIR /src
COPY --from=deps /src/node_modules ./node_modules
COPY --from=deps /src/sales_template/node_modules ./sales_template/node_modules
COPY packages/crm-core ./packages/crm-core
COPY sales_template ./sales_template
COPY pnpm-workspace.yaml package.json .npmrc ./
WORKDIR /src/sales_template
RUN node docker/stub-missing-libsql-natives.mjs
RUN pnpm build
RUN pnpm exec esbuild docker/runtime-init.ts \
  --bundle \
  --platform=node \
  --format=cjs \
  --outfile=docker/runtime-init.cjs \
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
COPY --from=build /src/sales_template/.output ./.output
COPY --from=build /src/sales_template/drizzle/migrations ./drizzle/migrations
COPY --from=build /src/sales_template/docker/runtime-init.cjs ./docker/runtime-init.cjs
COPY sales_template/docker/entrypoint.sh ./docker/entrypoint.sh
COPY --from=build /src/node_modules/@libsql ./node_modules/@libsql
# Empty data dirs only. Never COPY a sqlite file into the image.
RUN sed -i 's/\r$//' docker/entrypoint.sh \
  && chmod +x docker/entrypoint.sh \
  && mkdir -p /app/data/sqlite /app/data/uploads /app/data/uploads/proposals \
  && chown -R node:node /app/data /app/docker
EXPOSE 5000
HEALTHCHECK --interval=15s --timeout=5s --start-period=40s --retries=5 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:5000/api/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"]
ENTRYPOINT ["docker/entrypoint.sh"]
