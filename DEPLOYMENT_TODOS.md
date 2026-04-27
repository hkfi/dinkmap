# Deployment TODOs

This app is deployable as a Netlify-hosted Next.js MVP, but a few production items remain before treating it as a durable public service.

## Required for First Deploy

- Create a Supabase project.
- Run `supabase/schema.sql` in Supabase SQL editor or through the Supabase CLI.
- Add Netlify environment variables:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `CRON_SECRET`
- Set `CRON_SECRET` in Netlify so `netlify/functions/refresh-crowd-scores.mjs` can call `/api/cron/refresh-crowd-scores`.
- Confirm the Netlify scheduled function in `netlify.toml` is active after deploy.

## Persistence TODOs

- Court reads currently come from the versioned seed data in `src/lib/courts.ts`.
- Anonymous reports use an in-memory local store during development.
- Anonymous reports are inserted into Supabase when `SUPABASE_SERVICE_ROLE_KEY` is configured.
- Next step: read recent reports from Supabase in production instead of relying on the in-memory store.
- Next step: persist computed `crowd_scores` in Supabase from the cron route instead of only returning computed scores.
- Next step: add a seed/import script that upserts `src/lib/courts.ts` into the `courts` table.

## Data Quality TODOs

- Verify all NYC Pickleball Guide coordinates against current court locations.
- Mark seasonal, paid, or access-limited listings clearly in the UI.
- Add a visible source label for each court: NYC Parks or NYC Pickleball Guide.
- Add a correction workflow for bad coordinates, missing courts, and court-count changes.
- Decide whether non-NYC-Parks public-access courts should be included in the same map by default or behind a filter.

## Product TODOs

- Add persistent analytics events for aggregate page views, filter usage, report attempts, accepted reports, and geofence rejections.
- Add user-facing copy explaining that crowd levels are estimates, not official occupancy data.
- Add better loading state while OpenStreetMap tiles load.
- Add a stale-data state when Open-Meteo or Supabase is unavailable.
- Add a privacy page explaining location verification and that exact report coordinates are not stored.

## Operational TODOs

- Add monitoring for cron failures and report insertion failures.
- Add rate limiting backed by durable storage instead of process memory.
- Add basic abuse controls for repeated false reports.
- Add smoke tests against the deployed Netlify preview URL.
