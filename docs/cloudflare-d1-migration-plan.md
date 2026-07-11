# Cloudflare Workers and D1 Migration Plan

## Decision

Poker Wise will move from Vercel and Supabase PostgreSQL to a Cloudflare-native deployment:

```text
Browser -> Cloudflare Worker (Next.js via OpenNext) -> native D1 binding
```

D1 is never exposed through a public SQL proxy. Vercel and Supabase remain the production and rollback path until the final cutover.

## Target environments

| Purpose                    | Worker            | D1 database        | Binding |
| -------------------------- | ----------------- | ------------------ | ------- |
| Local and CI               | Local workerd     | Ephemeral local D1 | `DB`    |
| Development and PR preview | `poker-wise-dev`  | `poker-wise-dev`   | `DB`    |
| Production                 | `poker-wise-prod` | `poker-wise-prod`  | `DB`    |

Planned custom domains after the Workers deployments are stable:

- Production: `poker.leandrooriente.com`
- Development: `poker-dev.leandrooriente.com`

Workers Free is used for development. An initial remote smoke sample of 11 successful invocations measured approximately 209 ms CPU at p50 and 385 ms at p99 in Cloudflare analytics. The sample is not a load test, but it is far above the 10 ms Free allowance; production cutover therefore requires Workers Paid or a documented Cloudflare limit that safely covers this workload.

## Delivery phases

### 1. Cloudflare runtime foundation

- Upgrade Next.js to a version supported by OpenNext.
- Add OpenNext, Wrangler, Worker binding types, and workerd tests.
- Configure local, development, and production Worker environments.
- Replace Node-runtime proxy code with Edge middleware.
- Prove that the app builds and runs in workerd.

Exit gate: OpenNext build succeeds and authenticated smoke tests pass locally.

### 2. D1 application port

- Convert the Drizzle schema from PostgreSQL to SQLite.
- Store UUIDs as text and timestamps as integer epoch milliseconds.
- Preserve foreign keys, cascading deletes, and unique constraints.
- Add indexes for existing access patterns.
- Replace `node-postgres` with the native D1 Drizzle adapter.
- Replace transactions with atomic D1 batches.
- Remove N+1 and over-100-parameter query patterns.
- Replace build-time schema initialization with committed migrations.
- Remove PostgreSQL, Vercel cron, and database keepalive code.

Exit gate: unit, D1 integration, OpenNext build, and local E2E tests pass.

### 3. Cloudflare CI/CD and remote development

- Create the two remote D1 databases.
- Replace placeholder database IDs in `wrangler.jsonc`.
- Deploy `poker-wise-dev` and `poker-wise-prod` to workers.dev.
- Store Worker secrets without committing them.
- Configure GitHub Actions with Cloudflare account credentials.
- Keep deployments disabled until credentials and remote databases are ready.
- Require approval through the GitHub `Production` environment.

Exit gate: development migration and deployment complete through GitHub Actions.

### 4. Data migration rehearsal

- Export PostgreSQL from a read-only repeatable-read transaction.
- Convert timestamps explicitly from UTC to epoch milliseconds.
- Preserve IDs, bcrypt hashes, share-token hashes, nulls, and text exactly.
- Import only into empty D1 application tables.
- Compare canonical per-table SHA-256 manifests and row counts.
- Run `PRAGMA foreign_key_check`.
- Rehearse development remotely and production locally.

Exit gate: two consecutive rehearsals produce zero differences.

### 5. Production cutover

1. Deploy the production Worker candidate without a custom-domain route.
2. Take a final Supabase backup and verify restore access.
3. Enable maintenance mode on the Vercel deployment.
4. Confirm source writes have stopped.
5. Export a final PostgreSQL snapshot.
6. Import it into the empty production D1 database.
7. Verify every table, checksum, foreign key, login, and share flow.
8. Capture a D1 export and Time Travel bookmark.
9. Route `poker.leandrooriente.com` to the production Worker.
10. Smoke test while writes remain disabled.
11. Enable writes and monitor Worker and D1 errors.

Expected write freeze: up to 10 minutes.

## Rollback

Before D1 writes are enabled, remove the Cloudflare route and re-enable the unchanged Vercel/Supabase deployment.

After D1 accepts writes, do not switch back blindly. Freeze writes, export D1, compare it with the cutover manifest, reconcile changes into PostgreSQL, and only then restore the old route.

Supabase should remain available for 30 days after cutover unless an explicit earlier decommission decision is made.

## Migration commands

Generate and apply schema locally:

```bash
npm run db:generate
npm run db:migrate:local
npm run db:reset
```

Export PostgreSQL into an ignored, permission-restricted directory:

```bash
npm run db:export:postgres -- --source=development
npm run db:export:postgres -- --source=production
```

Import and verify a snapshot:

```bash
npx wrangler d1 execute poker-wise-dev --local --file <artifact-directory>/data.sql
npm run db:verify:d1 -- --manifest=<artifact-directory>/manifest.json
```

Remote commands require explicit `--remote`; production commands additionally require `--env=production`.

## Operational safeguards

- Production resets and scenario seeds are disabled in code.
- Remote development resets require `--confirm-remote-dev`.
- Migration artifacts are ignored by Git and written with restrictive permissions.
- Data imports use ordinary `INSERT`, never replace/upsert semantics.
- Runtime builds never create schemas or bootstrap production admins.
- GitHub deployment remains disabled through `CLOUDFLARE_DEPLOY_ENABLED=false` until remote setup is complete.
