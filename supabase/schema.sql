create table if not exists public.courts (
  id text primary key,
  slug text unique not null,
  name text not null,
  borough text not null,
  park_name text not null,
  location text not null,
  latitude double precision not null,
  longitude double precision not null,
  court_count integer not null,
  permit_required boolean not null default false,
  accessible boolean not null default false,
  source_url text not null,
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.crowd_reports (
  id uuid primary key default gen_random_uuid(),
  court_id text not null references public.courts(id) on delete cascade,
  level text not null check (level in ('Low', 'Moderate', 'Busy', 'Packed')),
  waiting_count integer check (waiting_count is null or waiting_count >= 0),
  open_courts integer check (open_courts is null or open_courts >= 0),
  note text check (note is null or char_length(note) <= 180),
  distance_bucket text not null check (distance_bucket in ('0-150m', '150-300m')),
  created_at timestamptz not null default now()
);

create table if not exists public.crowd_scores (
  court_id text primary key references public.courts(id) on delete cascade,
  level text not null check (level in ('Low', 'Moderate', 'Busy', 'Packed')),
  confidence text not null check (confidence in ('Model only', 'Fresh', 'High')),
  score integer not null check (score between 0 and 100),
  reasons text[] not null default '{}',
  latest_report_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  court_id text references public.courts(id) on delete set null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists crowd_reports_court_created_idx
  on public.crowd_reports (court_id, created_at desc);

alter table public.courts enable row level security;
alter table public.crowd_reports enable row level security;
alter table public.crowd_scores enable row level security;
alter table public.analytics_events enable row level security;

create policy "public can read active courts"
  on public.courts for select
  using (active = true);

create policy "public can read recent crowd reports"
  on public.crowd_reports for select
  using (created_at >= now() - interval '2 hours');

create policy "public can read crowd scores"
  on public.crowd_scores for select
  using (true);
