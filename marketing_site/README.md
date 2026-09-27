# Nuxxion marketing site

Public commercial site for **Nuxxion Martial Arts**. It is its own Nuxt application. It is not part of the Martial Arts image, the Sales image, or the Control Plane.

Local: http://localhost:5050

```bash
pnpm install
pnpm dev
```

From this folder: `pnpm typecheck`, `pnpm test`, `pnpm build`, then `pnpm test:e2e`.

Phase 1 demo requests are validated and acknowledged. They are not written to Sales. Do not send an academy URL in a field named `website`. Sales public intake uses that name as a honeypot and requires separate first and last names. Phase 2 has to map the single Name field on purpose.

`NUXT_PUBLIC_ANALYTICS_ENABLED` defaults to false. No analytics vendor is loaded.

Do not deploy this app onto the customer VPS from this phase. The Dockerfile builds this app alone and is not wired into customer compose.

Product images in `public/product/` are screens of the Martial Arts app from a disposable fictional seed. They are not a customer database.
