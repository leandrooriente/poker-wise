# Cloudflare Deployment Guide

Poker Wise runs as a Next.js application on Cloudflare Workers through OpenNext and uses a native D1 binding.

See [Cloudflare and D1 migration plan](./cloudflare-d1-migration-plan.md) for the staged migration and rollback strategy.

## Prerequisites

- Node.js 22 or newer (Node.js 24 is used in CI)
- Cloudflare account with Workers and D1 enabled
- Wrangler authenticated with `npx wrangler login`
- GitHub repository access for CI/CD

Workers Free is suitable for development. An initial remote sample of 11 successful invocations measured approximately 209 ms CPU at p50 and 385 ms at p99. This small sample is not a load test, but it is far above the documented 10 ms Free allowance. Production currently runs on Workers Free by explicit owner acceptance; monitor limits and upgrade if required.

## Resources

The committed Wrangler configuration expects:

| Environment | Worker            | D1 database       |
| ----------- | ----------------- | ----------------- |
| Development | `poker-wise-dev`  | `poker-wise-dev`  |
| Production  | `poker-wise-prod` | `poker-wise-prod` |

Create the databases once:

```bash
npx wrangler d1 create poker-wise-dev
npx wrangler d1 create poker-wise-prod
```

Commit the returned database IDs in `wrangler.jsonc`. D1 IDs are resource identifiers, not secrets.

## Worker secrets

Synchronize secrets from the ignored Vercel environment files without printing their values:

```bash
npm run cf:secrets -- --env=development --source=.env.local
npm run cf:secrets -- --env=production --source=.env.production.local
```

Development receives `AUTH_SECRET`, seed admin credentials, and `MAINTENANCE_MODE`. Production receives only `AUTH_SECRET` and `MAINTENANCE_MODE` because admin records are imported from PostgreSQL.

Production uses a newly generated `AUTH_SECRET`; the migration intentionally invalidates existing Vercel session cookies, so administrators must sign in again after cutover. Password hashes, application data, and public share links are unaffected. Production never bootstraps an admin during build or startup.

## Schema migrations

Generate migrations after changing `server/db/schema.ts`:

```bash
npm run db:generate
```

Review and commit every generated SQL file. Apply migrations explicitly:

```bash
npm run db:migrate:local
npm run db:migrate:dev
npm run db:migrate:production
```

Never run a production reset. `npm run db:reset` targets local D1 by default, permanently rejects production, and requires `--confirm-remote-dev` for remote development.

## Local verification

```bash
npm run db:migrate:local
npm run db:reset
npm run test -- --run
npm run test:d1 -- --run
npm run e2e:local
npm run cf:build
```

Use `npm run preview` to inspect the built application in the workerd runtime.

## Manual deployment

Development:

```bash
npm run db:migrate:dev
npm run deploy:dev
```

Production:

```bash
npm run db:migrate:production
npm run deploy:production
```

The production Worker is available on workers.dev for direct diagnostics and at its configured custom domain for user traffic.

## GitHub Actions

Create a Cloudflare API token from the **Edit Cloudflare Workers** template, scoped to only the required account and zone. Add these repository secrets with GitHub CLI:

```bash
gh secret set CLOUDFLARE_ACCOUNT_ID
gh secret set CLOUDFLARE_API_TOKEN
```

Deployments are gated by this repository variable:

```bash
gh variable set CLOUDFLARE_DEPLOY_ENABLED --body true
```

Leave it `false` until both remote D1 IDs, Worker secrets, and Cloudflare credentials are configured. Production deployments use the GitHub `Production` environment and run automatically after the required CI jobs pass on `main`.

## Domains

- `poker.leandrooriente.com` → `poker-wise-prod` (active)
- `poker-dev.leandrooriente.com` → `poker-wise-dev` (planned)

The production custom domain is committed in `wrangler.jsonc` so subsequent deployments retain it.

Toggle production between read-only and writable mode by updating its secret:

```bash
npm run cf:secrets -- --env=production --maintenance=true
npm run cf:secrets -- --env=production --maintenance=false
```

Maintenance mode rejects mutating `/api/admin` requests with HTTP 503 while preserving reads, login, and public shares.

## Source write freeze

The source database freeze is the authoritative rollback barrier. It changes the PostgreSQL database and application-role defaults to read-only, flushes stale Supabase backends, and verifies both the session and transaction pool endpoints before returning:

```bash
npm run db:writes:freeze -- \
  --confirm=FREEZE_PRODUCTION_WRITES \
  --ssl-no-verify
```

PostgreSQL remains frozen after cutover as the rollback source. Only unfreeze it as part of an approved rollback after reconciling any D1 writes:

```bash
npm run db:writes:unfreeze -- \
  --confirm=UNFREEZE_PRODUCTION_WRITES \
  --ssl-no-verify
```

## Backups and rollback

D1 Time Travel is always enabled, but it does not replace the cutover backup. Before routing production traffic:

1. Save a final Supabase `pg_dump` outside the repository.
2. Save the migration SQL and checksum manifest securely.
3. Export the newly imported D1 database.
4. Record the cutover timestamp and D1 bookmark.

The retained rollback deployment is https://poker-wise-g0gjqakgb-leandroorientes-projects.vercel.app at commit `1bf79c9042f97f013f77e811efe58ba4bb7ac687`. Its Vercel Git link is intentionally disconnected so it remains unchanged and no longer creates GitHub previews or statuses.

Before writes are enabled, rollback means removing the Cloudflare route and restoring Vercel traffic. After D1 accepts writes, reconcile D1 changes into PostgreSQL before switching back.
