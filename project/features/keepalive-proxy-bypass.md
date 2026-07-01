# Keepalive Proxy Bypass

## Summary

Follow-up fix for the Supabase keepalive endpoint: the production auth proxy currently redirects `/api/keepalive` to `/login`, preventing Vercel Cron from reaching the database ping route. Exclude the keepalive route from auth redirects while preserving `CRON_SECRET` protection inside the route handler.

## Status

testing

## Acceptance Criteria

- `/api/keepalive` is treated as a public proxy route and is not redirected to `/login` by `proxy.ts`.
- Keepalive authorization remains enforced by the route itself when `CRON_SECRET` is configured.
- Existing authenticated app routes still redirect unauthenticated users to `/login`.
- Automated tests cover the keepalive proxy bypass and existing redirect behavior.
- Lint, typecheck, and tests pass.
- The deployed public endpoint no longer returns the proxy login redirect.

## Tasks

- Update `proxy.ts` public route allowlist for `/api/keepalive`.
- Add proxy tests for public keepalive and protected app routes.
- Run validation commands.
- Verify the production endpoint after merge/deploy.

## Builder Notes

- Branch: `fix/keepalive-proxy-bypass`.
- Commit: `f41fe59` (`fix: bypass auth proxy for keepalive`).
- PR: https://github.com/leandrooriente/poker-wise/pull/65
- Updated `proxy.ts` so exact `/api/keepalive` requests are treated as public by the proxy and are not redirected before reaching the route handler.
- Left `app/api/keepalive/route.ts` authorization unchanged; existing route tests still cover `CRON_SECRET` enforcement.
- Added `proxy.test.ts` coverage for unauthenticated `/api/keepalive` passing through and unauthenticated `/admin` redirecting to `/login?from=/admin`.
- Validation passed:
  - `npx vitest run proxy.test.ts app/api/keepalive/route.test.ts server/cron/authorization.test.ts`
  - `npm run lint` (0 errors, 33 existing warnings)
  - `npm run typecheck`
  - `npm test -- --run` (17 test files, 78 tests)
- Production endpoint verification still needs to happen after merge/deploy.

## Tester Findings

### Validation Run — 2026-07-01

**Acceptance Criteria Results:**

1. ✅ `/api/keepalive` treated as public proxy route — `proxy.ts` adds `path === "/api/keepalive"` to the public-route check; `proxy.test.ts` confirms no redirect (status 200, no location header).
2. ✅ Keepalive authorization still enforced — `route.ts` calls `authorizeCronRequest`; `route.test.ts` confirms 401 when `CRON_SECRET` is set and bearer token is missing; `authorization.test.ts` covers allow/reject cases.
3. ✅ Existing app routes still redirect — `proxy.test.ts` confirms `/admin` redirects to `/login?from=/admin` (307).
4. ✅ Automated tests cover both behaviors — `proxy.test.ts` (2 tests), `route.test.ts` (3 tests), `authorization.test.ts` (5 tests); all 10 relevant tests pass.
5. ✅ Lint, typecheck, and tests pass — 0 lint errors (33 pre-existing warnings), typecheck clean, 78/78 tests pass across 17 files.
6. ⚠️ Deployed endpoint verification — Cannot verify until the branch is merged and deployed; this is a post-merge step.

**Blocking Finding — Uncommitted Changes & Missing PR:**

- `proxy.ts` is modified but **unstaged**.
- `proxy.test.ts` is **untracked**.
- Zero commits exist on `fix/keepalive-proxy-bypass` (no diff from `main`).
- No PR exists (`gh pr list --head fix/keepalive-proxy-bypass` returns empty).
- The Builder notes imply the work is complete, but nothing is committed.
- This blocks AC 6 verification (requires deploy, which requires merge, which requires a PR, which requires commits) and the Definition of Done.

**Action Required:** Builder must stage, commit, and push the changes, then create a PR.

## Resolution Notes

- Addressed the tester's blocking finding by staging and committing the keepalive proxy changes (`f41fe59`), pushing `fix/keepalive-proxy-bypass` to `origin`, and opening PR #65.
- Preserved route-level `CRON_SECRET` authorization; only the proxy public-route allowlist was changed.
- Set status back to `testing` for independent re-validation.

## Merge Evidence


