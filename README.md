# Poker Wise

A retro-styled poker match organizer with player management, live rebuy tracking, cashout validation, automatic settlement, history, and read-only group sharing.

## Features

- Manage poker groups and recurring players
- Track live matches, buy-ins, rebuys, and early cashouts
- Validate final chip values and minimize settlement transfers
- Review and delete match history
- Create revocable, read-only public share links
- Authenticate multiple group administrators

## Tech stack

- Next.js 16 and React 19
- TypeScript and Tailwind CSS
- Drizzle ORM with Cloudflare D1
- OpenNext on Cloudflare Workers
- Vitest, Cloudflare's Workers Vitest pool, and Playwright

The application is being migrated from Vercel and Supabase PostgreSQL. See [the migration plan](docs/cloudflare-d1-migration-plan.md).

## Prerequisites

- Node.js 22 or newer (Node.js 24 is used in CI)
- npm
- Wrangler authentication for remote Cloudflare operations

## Setup

```bash
git clone https://github.com/leandrooriente/poker-wise.git
cd poker-wise
npm install
cp .dev.vars.example .dev.vars
npm run db:migrate:local
npm run db:reset
```

Set development values in `.dev.vars`. Never commit that file.

## Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

`next dev` uses OpenNext's local Cloudflare context and a local D1 database. To exercise the built Worker instead:

```bash
npm run preview
```

## Validation

```bash
npm run typecheck
npm run lint
npm run test -- --run
npm run test:d1 -- --run
npm run e2e:local
npm run cf:build
```

The D1 suite runs inside workerd with isolated database state. Local E2E startup applies committed migrations and bootstraps a development admin.

## Database commands

```bash
npm run db:generate          # generate a reviewed migration
npm run db:migrate:local     # migrate local D1
npm run db:migrate:dev       # migrate remote development D1
npm run db:migrate:production
npm run db:reset             # local only by default
npm run db:seed -- full-demo
```

Production reset and scenario seeding are disabled. Remote development resets require an explicit confirmation flag.

## Cloudflare deployment

```bash
npm run deploy:dev
npm run deploy:production
```

Remote deployments remain disabled in GitHub Actions until `CLOUDFLARE_DEPLOY_ENABLED` is set to `true`. See [the Cloudflare deployment guide](docs/production-deployment.md) for resource, secret, migration, and rollback requirements.

## Project structure

```text
app/                  Next.js pages and API routes
components/           React components
server/auth/          Session authentication
server/db/            D1 schema, migrations, and queries
db/                   Browser-facing API clients
lib/                  Settlement and scoring logic
scripts/              Database administration and migration tooling
test/d1/              Workerd and D1 integration tests
e2e/                  Playwright end-to-end tests
docs/                 Decisions, deployment, and migration runbooks
```

## Design decisions

See [docs/decisions.md](docs/decisions.md).

## License

MIT
