# Standalone marketing image. Not a customer product image.
# Build from the repository root:
#   docker build -f marketing_site/Dockerfile -t nuxxion-marketing:phase1 .
FROM node:22-bookworm-slim AS build
RUN corepack enable
WORKDIR /src
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml .npmrc ./
COPY marketing_site/package.json ./marketing_site/
RUN pnpm install --frozen-lockfile --filter nuxxion-marketing...
COPY marketing_site ./marketing_site
WORKDIR /src/marketing_site
RUN pnpm build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=5050
ENV NUXT_PUBLIC_SITE_URL=http://localhost:5050
ENV NUXT_PUBLIC_ANALYTICS_ENABLED=false
COPY --from=build /src/marketing_site/.output ./
EXPOSE 5050
CMD ["node", "server/index.mjs"]
