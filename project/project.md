# Poker Wise Project

## Summary

Poker Wise is a Next.js app deployed at https://poker.leandrooriente.com/ and backed by a Supabase/Postgres database. The immediate project goal is to keep the Supabase database active by scheduling a lightweight API ping against the production deployment.

## Repository

- GitHub: https://github.com/leandrooriente/poker-wise
- Local path: `/home/leandrooriente/projects/poker-wise`
- Public site: https://poker.leandrooriente.com/

## Stack

- Next.js App Router
- TypeScript
- Drizzle ORM with Postgres/Supabase
- Vercel deployment
- Vitest / Playwright test tooling

## Current Feature

- `project/features/supabase-keepalive.md`

## Planning Notes

- Use a server-side API route so the ping performs an actual database query, not just a static page request.
- Prefer Vercel Cron because the app is already deployed on Vercel and `vercel.json` is present.
- Keep the endpoint lightweight and safe: perform a `select 1`-style query, return JSON status, and require a bearer token when `CRON_SECRET` is configured.
