# DinkMap

Mobile-first Next.js MVP for NYC public pickleball players. DinkMap maps NYC Parks-listed and community-guide public/outdoor courts, estimates current crowding from transparent rules, and accepts verified court-side reports within 300 meters.

## Stack

- Next.js App Router, TypeScript, Tailwind CSS v4
- shadcn/ui primitives
- MapLibre + OpenStreetMap raster tiles
- Open-Meteo current weather
- Supabase schema for production storage, with an in-memory local fallback for reports

## Run

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`.

## Data

The curated court seed lives in `src/lib/courts.ts` and is based on the NYC Parks pickleball listing. Run the Supabase SQL in `supabase/schema.sql` before wiring production persistence.

Reports require browser geolocation and are accepted only within 300 meters of the selected court. Exact user coordinates are not stored.

## Checks

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
```

## Deploy

Deploy to Netlify from the GitHub repo. Netlify detects the Next.js App Router app through OpenNext and runs `pnpm build`.

Set the variables in `.env.example` for production persistence. `CRON_SECRET` is optional for local previews, but recommended in Netlify so the scheduled function can call `/api/cron/refresh-crowd-scores` with a bearer token.

`netlify.toml` configures `netlify/functions/refresh-crowd-scores.mjs` to run every 15 minutes.
