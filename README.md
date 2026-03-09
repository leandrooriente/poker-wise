# Poker Wise – Local-first Poker Match Organizer

A 16-bit retro-styled PWA for organizing Texas Hold'em poker matches with automatic settlement. Designed to run on a single shared device (no backend, no sync). Stores all data locally in the browser.

## Features

- **Player Management**: Add, edit, delete recurring players.
- **Match Flow**: 
  1. Select players and set buy‑in (default 10 EUR, configurable per app & per match)
  2. Live match tracking with rebuys **anytime** (not just when busted)
  3. Cashout: enter final chip values in euros (including cents)
  4. Automatic settlement: calculates net results and generates minimized “who pays whom” transfers
  5. Match history with detailed summaries
- **16-bit Retro Aesthetic**: Pixel fonts, CRT scanlines, chunky borders, retro color palette (green/teal/blue/yellow).
- **Local‑first PWA**: Works offline, installable, no backend, no tracking, no export/import needed for MVP.

## Tech Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS** (with custom 16‑bit theme)
- **Vitest** (unit tests) + **Playwright** (E2E tests)
- **PWA** (next‑pwa, service worker)
- **LocalStorage** persistence (no external database)

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm/bun

### Installation

```bash
git clone https://github.com/leandrooriente/poker-wise.git
cd poker-wise
npm install
```

### Development

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Testing

- Unit tests: `npm run test`
- E2E tests (requires dev server running): `npm run e2e`
- Lint: `npm run lint`
- Type check: `npm run typecheck`

### Building for Production

```bash
npm run build
npm start
```

The built app is a fully functional PWA that can be installed on supported devices.

## Project Structure

```
app/                  # Next.js app router pages
  page.tsx            # Players management
  new-match/          # Match creation
  live-match/         # Rebuy tracking
  cashout/            # Final chip value entry
  results/            # Settlement results
  history/            # Past matches
components/           # React components (Header, PlayerCard, …)
types/                # TypeScript interfaces (Player, Match, …)
db/                   # LocalStorage CRUD operations (players, matches, settings)
lib/                  # Business logic (settlement engine)
public/               # Static assets, PWA manifest
e2e/                  # Playwright end‑to‑end tests
```

## Design Decisions

See [docs/decisions.md](docs/decisions.md) for a timeline of architectural and implementation choices.

## License

MIT