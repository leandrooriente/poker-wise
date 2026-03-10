# Backend Rollout Plan

## Overview

This project will migrate from browser `localStorage` to a Vercel-hosted backend in phased PRs.

Key decisions:
- Database: Vercel Postgres
- Admin auth: seeded initial admin with email + password
- Public access: read-only share token
- Testing: scenario-based DB seeds, session-seeded auth for most E2E tests
- Delivery: multiple small PRs, optimized for speed over temporary compatibility

## Seed Scenarios

- `empty`
  - seeded admin only
- `basic-group`
  - seeded admin
  - 1 group
  - 4 players
  - public share token
- `live-match`
  - `basic-group`
  - 1 active match
  - realistic rebuys
- `history`
  - `basic-group`
  - multiple finished matches
  - public share token
- `full-demo`
  - active match
  - multiple finished matches
  - public share token

Rules:
- all non-empty scenarios include a public share token
- local `db:reset` defaults to `full-demo`
- E2E specs choose scenarios explicitly
- tests must never depend on leftover DB state

## PR 1 — Backend Foundation

Goal:
- create the backend base layer

Includes:
- Vercel Postgres connection
- ORM and migrations
- env validation
- schema:
  - `admins`
  - `groups`
  - `group_admins`
  - `players`
  - `matches`
  - `match_entries`
  - `group_share_tokens`
- seeded initial admin bootstrap from env
- resettable seed system
- local `db:reset`
- test DB reset/seed helper for Playwright

Acceptance:
- schema builds from zero
- admin bootstrap is idempotent
- local/test DB reset works with named scenarios

## PR 2 — Admin Auth

Goal:
- establish admin login/session boundary

Includes:
- Auth.js with credentials provider
- login/logout
- protected `/admin` shell
- reusable `requireAdmin()` helper
- Playwright session-seeding helper

Acceptance:
- seeded admin can log in
- unauthenticated users cannot access admin routes
- most E2E tests can bypass login UI

## PR 3 — Group Domain + Authorization

Goal:
- make groups real backend-owned entities with admin permissions

Includes:
- server query/mutation layer for groups
- `group_admins` authorization checks
- group CRUD moved off `localStorage`
- server-backed group routing

Acceptance:
- admin can manage groups
- only group admins can manage their group

## PR 4 — Group Players

Goal:
- move player management to group-scoped backend records

Includes:
- real `players` table CRUD
- admin UI for group player management
- stop using current `users + members` approach for migrated player flows

Acceptance:
- players belong to one group
- admins can create/edit/remove players

## PR 5 — Match Lifecycle

Goal:
- move active play flow to backend

Includes:
- server-backed match creation
- live match loading
- rebuy mutations
- match status handling

Acceptance:
- admin can start a match
- rebuys persist in DB
- live state survives refresh

## PR 6 — Cashout + Settlement + Results

Goal:
- make settlement server-owned and canonical

Includes:
- save final values in DB
- server-side validation
- persist settled results
- server-backed results page

Acceptance:
- final values saved in DB
- totals validated server-side
- results are deterministic and canonical

## PR 7 — History

Goal:
- move historical views to backend

Includes:
- server-backed history queries
- multi-match list support
- `history` scenario with multiple finished matches

Acceptance:
- history page reads from DB
- multiple finished matches render correctly

## PR 8 — Public Share Views

Goal:
- expose full read-only group viewing

Includes:
- `/share/[token]`
- token lookup via `group_share_tokens`
- read-only views for:
  - live match
  - results
  - history

Acceptance:
- anyone with token can read
- public users cannot mutate anything

## PR 9 — Cleanup

Goal:
- remove obsolete local-first persistence paths

Includes:
- remove or replace:
  - `db/groups.ts`
  - `db/users.ts`
  - `db/members.ts`
  - `db/matches.ts`
  - `db/players.ts`
  - `lib/active-group.tsx` local-storage assumptions
- update docs and tests

Acceptance:
- no app-critical flow depends on `localStorage`
- legacy compatibility layer is removed

## Validation Rules For Every PR

Run:
- `lint`
- `typecheck`
- `unit tests`
- `Playwright`
- `build`

## Recommended Branch Names

- `feat/backend-foundation`
- `feat/admin-auth`
- `feat/server-groups`
- `feat/server-players`
- `feat/server-match-lifecycle`
- `feat/server-settlement-results`
- `feat/server-history`
- `feat/public-share-views`
- `chore/remove-local-storage-backend`