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