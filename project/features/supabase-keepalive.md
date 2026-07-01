# Supabase Keepalive API Ping

## Summary

Add a scheduled keepalive endpoint for Poker Wise that Vercel can call regularly. The endpoint must execute a lightweight database query so Supabase sees activity and does not pause the project for inactivity.

## Status

merged

## Acceptance Criteria

- A Next.js API route exists for keepalive checks and performs a lightweight server-side Postgres/Supabase query.
- The route returns clear JSON success/failure responses without exposing secrets or database details.
- The route rejects unauthorized requests when `CRON_SECRET` is configured, while remaining testable/development-friendly.
- Vercel Cron is configured to call the keepalive route on a regular schedule suitable for Supabase inactivity prevention.
- Unit/type/lint validation passes for the added code.
- Documentation or project notes indicate the required production environment variable (`CRON_SECRET`) if applicable.

## Tasks

- Inspect existing database and API route patterns.
- Add a keepalive API route that pings the database.
- Add authorization helper logic for cron requests.
- Configure Vercel Cron in `vercel.json`.
- Add/update tests for authorization behavior where practical.
- Run lint, typecheck, and relevant tests.
- Update this feature file with builder notes and handoff status.

## Builder Notes

- Added `GET /api/keepalive` as a Node.js API route that performs `select 1` through Drizzle/Postgres and returns sanitized JSON success/failure responses.
- Added cron authorization helper: requests are allowed when `CRON_SECRET` is unset/blank for development, and require `Authorization: Bearer <CRON_SECRET>` when configured.
- Configured Vercel Cron in `vercel.json` to call `/api/keepalive` daily at 12:00 UTC.
- Documented production `CRON_SECRET` setup in `docs/production-deployment.md`.
- Added Vitest coverage for cron authorization and keepalive route success/unauthorized/failure behavior.
- Validation: `npm run lint` passes with 33 existing warnings and 0 errors; `npm run typecheck` passes; `npm test -- --run` passes (16 files, 76 tests).
- Branch: `feat/supabase-keepalive-cron`; implementation commit `b19d3d7`; PR #64 created after builder/tester validation.

## Tester Findings

### Validation: 2026-07-01

**All 6 acceptance criteria PASSED.**

1. **Next.js API route with lightweight DB query** ✅
   - `app/api/keepalive/route.ts` — `GET` handler calls `pingDatabase()` which executes `select 1` via Drizzle/Postgres.
   - Route is Node.js runtime with `force-dynamic`.

2. **Clear JSON success/failure responses without exposing secrets** ✅
   - Success: `{ status: "ok", database: "reachable", checkedAt: "<ISO>" }` (200)
   - Unauthorized: `{ status: "error", error: "Unauthorized" }` (401)
   - DB failure: `{ status: "error", error: "Database keepalive failed" }` (500) — original error (which could contain connection details) is only `console.error`'d server-side, never returned to client.

3. **Rejects unauthorized requests when CRON_SECRET configured; dev-friendly without it** ✅
   - `server/cron/authorization.ts`: when `CRON_SECRET` is unset/blank → `{ authorized: true }`; when set → requires `Authorization: Bearer <CRON_SECRET>`.
   - Tests cover: no secret, blank secret, matching bearer, missing bearer, wrong bearer.

4. **Vercel Cron configured on suitable schedule** ✅
   - `vercel.json` crons: `{ path: "/api/keepalive", schedule: "0 12 * * *" }` — daily at 12:00 UTC.
   - Supabase pauses after 7 days of inactivity; daily schedule is well within the window.

5. **Unit/type/lint validation passes** ✅
   - `npm run lint`: 0 errors (33 pre-existing warnings, none in keepalive code).
   - `npm run typecheck`: passes cleanly.
   - `npm test -- --run`: 16 files, 76 tests all passing.
   - Keepalive-specific: 8 tests across `route.test.ts` and `authorization.test.ts` all pass.

6. **Documentation for CRON_SECRET** ✅
   - `docs/production-deployment.md` lists `CRON_SECRET` as a required env var with description and setup guidance.

### Observation (not an AC failure)

- At tester validation time, changes were not yet committed or pushed. The orchestrator subsequently committed the work, pushed `feat/supabase-keepalive-cron`, and opened PR #64.

## Resolution Notes

- No tester findings were present for this builder pass.

## Merge Evidence

- Branch: `feat/supabase-keepalive-cron`
- Implementation commit: `b19d3d7` (`feat: add Supabase keepalive cron`)
- Pull request: https://github.com/leandrooriente/poker-wise/pull/64
- Local validation before PR: `npm run lint` (0 errors, existing warnings), `npm run typecheck`, `npm test -- --run` (16 files, 76 tests)
- Merge target: `main`
