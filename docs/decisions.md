# Decision Timeline – Poker Wise

## 2026‑03‑09 – Initial Build Session

### Architecture
- **Local‑first MVP**: Chose a PWA that stores all data in browser localStorage. No backend, no sync, no authentication. The app is intended for a single shared device (e.g., a tablet at the poker table).
- **Tech stack**: Next.js 14 (App Router) with TypeScript, Tailwind CSS, Vitest, Playwright, next‑pwa. Repository: `leandrooriente/poker-wise` (private).
- **Visual direction**: 16‑bit retro aesthetic with pixel font (`Press Start 2P`), CRT scanline effect, chunky borders, and a green/teal/blue/yellow color palette.

### Core Models
- **Player**: `id`, `name`, `notes`, `preferredBuyIn` (cents), `createdAt`.
- **Match**: `id`, `title?`, `createdAt`, `startedAt?`, `endedAt?`, `buyInAmount` (cents), `players` (array of `MatchPlayer`).
- **MatchPlayer**: `playerId`, `buyIns`, `finalValue` (cents).
- **SettlementTransfer**: `fromPlayerId`, `toPlayerId`, `amount` (cents), `description?`.

### Settlement Engine
- **Input**: each player’s number of buy‑ins and final chip value in euros (including cents).
- **Calculation**: net = final value – (buy‑ins × buy‑in amount).
- **Validation**: total final value must equal total paid‑in amount.
- **Transfer minimization**: greedy algorithm pairing debtors with creditors, sorted by amount.
- **Unit‑tested** (`lib/settlement.test.ts`) with cent‑based arithmetic to avoid floating‑point errors.

### Persistence
- **db/players.ts**, **db/matches.ts**, **db/settings.ts** – CRUD functions that read/write to `localStorage` with error handling.
- Data keys: `poker-wise-players`, `poker-wise-matches`, `poker-wise-settings`.
- All operations are async (for future migration to IndexedDB if needed).

### UI Screens (App Router)
1. **Players** (`/`): list, add, edit, delete recurring players.
2. **New Match** (`/new-match`): select players, set buy‑in (default from settings, override per match), start match.
3. **Live Match** (`/live-match?match=…`): track rebuys (anytime, not only when busted), proceed to cashout.
4. **Cashout** (`/cashout?match=…`): enter final chip values in euros, real‑time validation, settle.
5. **Results** (`/results?match=…`): show net balances and minimized transfers.
6. **History** (`/history`): list of past matches with expandable details (player balances, transfers, metadata).

### Styling
- Tailwind theme extended with custom colors, pixel font, retro shadows, borders, and animations.
- CRT scanline overlay via `::before` pseudo‑element on `body`.
- Consistent use of `font-pixel` for headings and numeric values, `font-retro-sans` for body text.

### Testing
- **Unit tests** (Vitest) for settlement engine.
- **E2E tests** (Playwright) for the complete user flow (add player → start match → rebuy → cashout → settle → history). Tests run against a real dev server and clear `localStorage` before each test.
- **Linting** (ESLint) and **type checking** (TypeScript) configured.

### PWA Configuration
- `next-pwa` plugin with `dest: "public"`, disabled in development.
- `manifest.json` with icons, theme colors, display `standalone`.
- Fixed TypeScript declaration error by installing `@types/next-pwa` and casting config to `any` (version mismatch).

### Git Workflow
- Branch `feature/initial-app` (not yet pushed to remote).
- All changes follow TDD where applicable (tests written before implementation).

## 2026‑03‑09 – History Screen Implementation

### Requirements
- Display past matches stored in `localStorage`.
- Show match date, buy‑in, player count, total pot.
- Expandable details: player balances, settlement transfers, metadata.

### Implementation
- Client component (`app/history/page.tsx`) loads matches and players, enriches with settlement data.
- Sorted by creation date descending.
- Expand/collapse with retro styling.
- Uses existing `calculateSettlement` for consistency.

### E2E Test Adaptation
- Fixed selectors: `getByPlaceholder` for player name input, `getByLabel` for final value (after adding `htmlFor`/`id`), `getByRole('heading')` for player names in results/history.
- Transfer verification uses class‑based locator filtered by player names and amount.

## 2026‑03‑10 – Vercel Auto‑Deployment Setup

### Requirements
- Enable automatic deployments to Vercel on every push to `main`.
- Ensure code quality gates (lint, typecheck, tests, build) pass before merging.
- Provide missing PWA assets for proper installability.
- Pin Node.js version for consistent builds across environments.

### Implementation
- **GitHub Actions CI workflow** (`.github/workflows/ci.yml`):
  - Runs lint, typecheck, unit tests, build, and Chromium-only E2E tests on push and pull requests.
  - Uses Node.js 20 (specified in `.nvmrc` and `package.json` engines).
  - Jobs run in parallel for faster feedback.
- **PWA assets**: Generated `icon‑192.png` and `icon‑512.png` using a simple SVG‑based script (`scripts/generate‑icons.js`); copied `favicon.ico` to `public/`.
- **Node version pinning**: Added `engines` field (`node: ">=20"`) and `.nvmrc` file.
- **Documentation**: Updated README with deployment section; added this decision log entry.

### Branch Protection
- The `main` branch should be protected via GitHub repository settings:
  - Require status checks to pass before merging (typecheck, lint, unit‑tests, build, e2e).
  - Require a pull request (at least zero approvals) and disallow direct pushes.
- This ensures that only validated changes are deployed.

### Next Steps for Deployment
1. Connect the GitHub repository to Vercel (project settings → Git Integration).
2. Configure environment variables if needed (none required for this local‑first MVP).
3. Enable branch protection rules as described above.
4. Merge this branch (`opencode/kimaki-vercel-auto-deploy`) into `main` to activate the CI pipeline.

## 2026‑03‑10 – Backend Foundation & Migration Plan

### Requirements
- Migrate Poker Wise from a local‑first localStorage app to a Vercel Postgres backend with admin authentication and public read‑only sharing.
- Deliver migration in multiple small, reviewable PRs (9 phases) to reduce risk.
- Optimize for speed over temporary compatibility – intermediate phases may temporarily break functionality.

### Implementation (PR 1 – Backend Foundation)
- **Database schema**: Defined `groups`, `users`, `members`, `matches`, `match_entries`, `admins`, `group_share_tokens` tables using Drizzle ORM.
- **Environment validation**: Zod schema for `POSTGRES_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `AUTH_SECRET`, `NODE_ENV`.
- **Database reset script**: `scripts/db-reset.ts` drops/recreates tables, bootstraps a seeded admin account (password from env).
- **Scenario‑based seeding**: Five named seed scenarios (`empty`, `basic-group`, `live-match`, `history`, `full-demo`) for local development and deterministic E2E tests.
- **Seed factories**: Reusable factory functions for creating groups, players, matches, entries, and public share tokens.
- **Local PostgreSQL**: Docker Compose configuration (`docker-compose.yml`) for local development.
- **Package scripts**: `db:reset`, `db:seed`, `db:migrate`, `db:studio`.
- **Unit test**: Added validation test for environment schema.
- **E2E helper**: `e2e/db-helpers.ts` with `resetDatabase`, `seedScenario`, `resetAndSeed` functions for test setup.

### Decisions
- **Admin authentication**: Seeded password auth (no email magic links) for MVP simplicity.
- **Public share tokens**: Every non‑empty seed scenario includes a public share token; anyone with the link can view everything read‑only.
- **Deterministic seeding**: E2E tests will rely on explicit scenario seeds, not leftover database state.
- **Local default**: `db:reset` defaults to `full-demo` scenario for convenient local development.

### Next Steps (Remaining PRs)
1. PR 2 – Admin login UI (password form, session cookie).
2. PR 3 – Group creation/management UI.
3. PR 4 – Match lifecycle (create, start, rebuy, cashout) backed by DB.
4. PR 5 – Public share view (read‑only).
5. PR 6 – Migrate existing localStorage data to backend (one‑time migration).
6. PR 7 – Remove localStorage dependencies.
7. PR 8 – Add API route protection (admin‑only endpoints).
8. PR 9 – Final polish and cleanup.

### Relevant Files
- `docs/backend-rollout-plan.md` – full phased PR specification
- `server/db/schema.ts` – core table definitions
- `server/env/index.ts` – env validation
- `scripts/db-reset.ts` – full database reset with admin bootstrap
- `scripts/lib/scenarios.ts` – named scenario implementations
- `scripts/lib/seed-factories.ts` – reusable seed factories
- `e2e/db-helpers.ts` – E2E test database helpers
- `docker-compose.yml` – local PostgreSQL container

## Open Questions / Future Work
- **Export/import**: Not in MVP, but could be added later via JSON download/upload.
- **Multiple devices**: Sync would require a backend; out of scope for MVP.
- **Chip denomination mapping**: Intentionally omitted – users enter final euro value directly.
- **Advanced statistics**: Win/loss per player, session graphs, etc.
- **PWA offline robustness**: Ensure service worker caches all assets; currently basic setup.

## Next Steps
1. Push `feature/initial-app` to remote and create a pull request.
2. Run full test suite (lint, typecheck, unit, E2E) and fix any remaining warnings.
3. Deploy to Vercel for demo (optional – local‑first app works without backend).
4. Gather feedback from poker group.