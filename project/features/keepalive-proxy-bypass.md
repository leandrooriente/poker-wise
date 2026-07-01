# Keepalive Proxy Bypass

## Summary

Follow-up fix for the Supabase keepalive endpoint: the production auth proxy currently redirects `/api/keepalive` to `/login`, preventing Vercel Cron from reaching the database ping route. Exclude the keepalive route from auth redirects while preserving `CRON_SECRET` protection inside the route handler.

## Status

merged

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

### Validation Run 1 — 2026-07-01

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

### Validation Run 2 — 2026-07-01 (post-rework)

Previous blocking finding resolved: commit `f41fe59` pushed to `fix/keepalive-proxy-bypass`, PR #65 open and mergeable.

**Acceptance Criteria Re-validation:**

1. ✅ **`/api/keepalive` is treated as a public proxy route** — `proxy.ts` line 10 adds `path === "/api/keepalive"` to the public-route conditional. Exact match (not `startsWith`) correctly limits the bypass to the single route. `proxy.test.ts` confirms: unauthenticated request to `/api/keepalive` returns status 200, `x-middleware-next: 1`, no `location` header.

2. ✅ **Keepalive authorization remains enforced by the route handler** — `app/api/keepalive/route.ts` still calls `authorizeCronRequest(request)` as its first action. `route.test.ts` confirms 401 when `CRON_SECRET` is set and no bearer token is provided; `authorization.test.ts` covers 5 allow/reject cases. Proxy bypass does **not** bypass route-level auth.

3. ✅ **Existing authenticated app routes still redirect unauthenticated users to `/login`** — `proxy.test.ts` confirms `/admin` redirects to `/login?from=/admin` (307). Other routes (e.g. `/`, `/dashboard`) are unaffected by the change since only the `/api/keepalive` exact match was added.

4. ✅ **Automated tests cover both behaviors** — `proxy.test.ts` (2 tests: keepalive pass-through + admin redirect), `route.test.ts` (3 tests: no-secret OK, missing token 401, DB failure 500), `authorization.test.ts` (5 tests: no-secret, blank-secret, matching-token, missing-token, wrong-token). All 10 relevant tests pass.

5. ✅ **Lint, typecheck, and tests pass** — `npm run lint`: 0 errors (33 pre-existing warnings); `npm run typecheck`: clean; `npm test -- --run`: 17 files, 78 tests all passing.

6. ⚠️ **Deployed endpoint no longer returns proxy login redirect** — Cannot verify until PR #65 is merged and Vercel deploys. Post-merge verification step required.

**Commit & PR State:**
- Commit `f41fe59` on branch `fix/keepalive-proxy-bypass` (1 code commit + 1 docs commit ahead of `main`).
- PR #65 open, mergeable (`MERGEABLE`).
- No uncommitted or untracked files remaining.

**Verdict:** All locally verifiable acceptance criteria pass. The only remaining item is AC 6 (production endpoint verification), which is inherently a post-merge step. No blocking findings.

## Resolution Notes

- Addressed the tester's blocking finding by staging and committing the keepalive proxy changes (`f41fe59`), pushing `fix/keepalive-proxy-bypass` to `origin`, and opening PR #65.
- Preserved route-level `CRON_SECRET` authorization; only the proxy public-route allowlist was changed.
- Independent re-validation passed; status advanced through `ready-for-merge` for PR merge.

## Merge Evidence

- Branch: `fix/keepalive-proxy-bypass`
- Implementation commit: `f41fe59` (`fix: bypass auth proxy for keepalive`)
- Handoff/evidence commit: `c28b9cf` (`docs: update keepalive proxy bypass handoff`)
- Pull request: https://github.com/leandrooriente/poker-wise/pull/65
- Local validation: `npm run lint` (0 errors, existing warnings), `npm run typecheck`, `npm test -- --run` (17 files, 78 tests)
- Merge target: `main`

