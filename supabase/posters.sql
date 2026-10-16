-- ============================================================
-- Posters — run this to switch the Posters page on
--
-- Two steps, both one-off:
--
--   1. Paste this whole file into the Supabase SQL editor and run it.
--   2. Storage → New bucket → name it "posters" and tick Public.
--
-- Until both are done the dashboard shows an amber notice and uploads fail.
--
-- Staff upload a poster from the dashboard; the storefront reads them back by
-- placement. Every write goes through the dashboard's service-role key, which
-- bypasses row level security, so no insert/update policy is granted here —
-- shoppers can read live posters and nothing else.
-- ============================================================

create table if not exists public.posters (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  image_url   text not null,
  -- Optional click-through. Left blank the poster is simply an image.
  link_url    text,
  -- Where it appears on the site.
  --   hero   → the rotating banner at the top of the home page
  --   home   → the poster blocks dotted between the home page sections
  --   offers → the /offers wall
  --   deals  → the Best deals page
  placement   text not null default 'home'
              check (placement in ('hero', 'home', 'offers', 'deals')),
  sort_order  int  not null default 0,
  is_active   boolean not null default true,
  -- Optional run dates. Null on either side means "no bound that way".
  starts_at   timestamptz,
  ends_at     timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists posters_placement_idx
  on public.posters (placement, sort_order, created_at desc);

alter table public.posters enable row level security;

drop policy if exists "posters are public" on public.posters;

-- Shoppers only ever see a poster that is switched on and inside its run
-- dates. The same predicate is repeated in the storefront's query layer, so a
-- poster that expires mid-session drops out on the next render too.
create policy "posters are public" on public.posters for select using (
  is_active
  and (starts_at is null or starts_at <= now())
  and (ends_at   is null or ends_at   >= now())
);
