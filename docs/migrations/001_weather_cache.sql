-- Weather cache table
-- Stores the last successful Yr/MET Norway forecast per location.
-- Key is lat/lon rounded to 2 decimal places (~1 km grid).
-- Run once in the Supabase SQL editor.

create table if not exists weather_cache (
  lat_key   numeric(7, 2) not null,
  lon_key   numeric(7, 2) not null,
  days      jsonb         not null,
  fetched_at timestamptz  not null default now(),
  primary key (lat_key, lon_key)
);

-- Allow the anon key to read and write (app uses NEXT_PUBLIC_SUPABASE_ANON_KEY)
alter table weather_cache enable row level security;

create policy "public read"  on weather_cache for select using (true);
create policy "public write" on weather_cache for insert with check (true);
create policy "public update" on weather_cache for update using (true);
