# Cloudflare Workers and D1 Migration Plan

## Decision

Poker Wise will move from Vercel and Supabase PostgreSQL to a Cloudflare-native deployment:

```text
Browser -> Cloudflare Worker (Next.js via OpenNext) -> native D1 binding
```

D1 is never exposed through a public SQL proxy. Supabase PostgreSQL remains frozen as the rollback source for 30 days after cutover; Vercel no longer serves production traffic.

## Current status

All five phases are complete. Production cutover completed on 2026-07-11.

### Remote Cloudflare state

- `poker-wise-dev` and `poker-wise-prod` D1 databases exist in WEUR with committed IDs and migrations.
- Development remains seeded at https://poker-wise-dev.me-fb8.workers.dev.
- Production is live at https://poker.leandrooriente.com through `poker-wise-prod`; the workers.dev hostname remains available for direct diagnostics.
- Production D1 contains the verified PostgreSQL snapshot: 2 admins, 1 group, 2 group-admin memberships, 9 players, 3 matches, 14 entries, and 1 share token.
- Cloudflare maintenance mode is disabled, application writes are enabled, and Supabase PostgreSQL defaults remain read-only through both pool endpoints.
- Production uses the rotated `AUTH_SECRET`; existing Vercel sessions were intentionally invalidated.

### GitHub state

- PR #68 was squash-merged as `f60a88a23cc425e941bc1d5dc75cd2f2f364d626`; PR #69 was closed.
- `main` requires the four Cloudflare CI checks: typecheck/lint/unit, D1 integration, OpenNext build, and local-D1 E2E.
- `CLOUDFLARE_DEPLOY_ENABLED` is `true`; every green merge to `main` deploys automatically through the GitHub `Production` environment.
- The Vercel Git link is disconnected, preventing new previews and status checks. The last ready production deployment remains available for rollback at https://poker-wise-g0gjqakgb-leandroorientes-projects.vercel.app from commit `1bf79c9042f97f013f77e811efe58ba4bb7ac687`.

### Validation summary

- Typecheck, lint, 82 unit tests, 2 D1 integration tests, OpenNext build, and 42 local-D1 E2E tests passed before merge.
- Three pre-cutover production exports and the final frozen export produced identical per-table counts and SHA-256 digests.
- The final D1 verifier passed every table checksum and `PRAGMA foreign_key_check`.
- Production login, authenticated reads, maintenance behavior, application writes, temporary-group cleanup, and public sharing passed on the custom domain.
- A final D1 SQL export and Time Travel bookmark were captured after the write/share smoke test.
- An initial sample measured approximately 209 ms CPU p50 / 385 ms p99. The owner explicitly accepted proceeding on Workers Free and will upgrade if observed limits require it.

## Target environments

| Purpose                    | Worker            | D1 database        | Binding |
| -------------------------- | ----------------- | ------------------ | ------- |
| Local and CI               | Local workerd     | Ephemeral local D1 | `DB`    |
| Development and PR preview | `poker-wise-dev`  | `poker-wise-dev`   | `DB`    |
| Production                 | `poker-wise-prod` | `poker-wise-prod`  | `DB`    |

Custom domains:

- Production (active): `poker.leandrooriente.com`
- Development (planned): `poker-dev.leandrooriente.com`

Workers Free is currently used for both environments. An initial remote smoke sample of 11 successful invocations measured approximately 209 ms CPU at p50 and 385 ms at p99 in Cloudflare analytics. The owner explicitly accepted this risk for cutover; monitor Worker limits and upgrade production if required.

## Delivery phases

### 1. Cloudflare runtime foundation ✅

- Upgrade Next.js to a version supported by OpenNext.
- Add OpenNext, Wrangler, Worker binding types, and workerd tests.
- Configure local, development, and production Worker environments.
- Replace Node-runtime proxy code with Edge middleware.
- Prove that the app builds and runs in workerd.

Exit gate: OpenNext build succeeds and authenticated smoke tests pass locally.

### 2. D1 application port ✅

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

### 3. Cloudflare CI/CD and remote development ✅

- Create the two remote D1 databases.
- Replace placeholder database IDs in `wrangler.jsonc`.
- Deploy `poker-wise-dev` and `poker-wise-prod` to workers.dev.
- Store Worker secrets without committing them.
- Configure GitHub Actions with Cloudflare account credentials.
- Keep deployments disabled until credentials and remote databases are ready.
- Scope production deployments through the GitHub `Production` environment.

Exit gate: development migration and deployment complete through GitHub Actions. ✅ Complete.

### 4. Data migration rehearsal ✅

- Export PostgreSQL from a read-only repeatable-read transaction.
- Convert timestamps explicitly from UTC to epoch milliseconds.
- Preserve IDs, bcrypt hashes, share-token hashes, nulls, and text exactly.
- Import only into empty D1 application tables.
- Compare canonical per-table SHA-256 manifests and row counts.
- Run `PRAGMA foreign_key_check`.
- Rehearse development remotely and production locally.

Exit gate: two consecutive rehearsals produce zero differences. ✅ Complete.

### 5. Production cutover ✅

Completed on 2026-07-11:

1. Created a permission-restricted final PostgreSQL archive and proved it with an isolated restore.
2. Captured the empty production D1 export and pre-import Time Travel bookmark.
3. Froze PostgreSQL database/role defaults and recycled both Supabase session and transaction pool backends.
4. Exported the final read-only snapshot and imported 32 statements into production D1.
5. Verified all table counts, canonical SHA-256 digests, and foreign keys.
6. Captured post-import and post-cutover D1 exports and bookmarks.
7. Replaced the Vercel CNAME with the `poker-wise-prod` custom domain.
8. Verified login, authenticated reads, and the maintenance write barrier on the production hostname.
9. Enabled Cloudflare writes and verified create, public share, read, cleanup, and exact post-cleanup checksums.
10. Confirmed PostgreSQL remains frozen and observed no Worker errors during post-cutover health traffic.

The final cutover write-unavailability window ran from 09:04:08Z until Cloudflare writes were confirmed at 09:11:31Z (7 minutes 23 seconds). PostgreSQL remains frozen as the rollback source.

## Rollback

Before D1 writes are enabled, remove the Cloudflare route, run `npm run db:writes:unfreeze -- --confirm=UNFREEZE_PRODUCTION_WRITES --ssl-no-verify`, and restore Vercel traffic.

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
- Source freeze/unfreeze commands require distinct, explicit production confirmations and verify the default on a new connection.
- Remote development resets require `--confirm-remote-dev`.
- Migration artifacts are ignored by Git and written with restrictive permissions.
- Data imports use ordinary `INSERT`, never replace/upsert semantics.
- Runtime builds never create schemas or bootstrap production admins.
- GitHub deployment is enabled through `CLOUDFLARE_DEPLOY_ENABLED=true`; production deploys automatically only after the required CI jobs pass on `main`.
