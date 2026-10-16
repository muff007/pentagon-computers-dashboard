-- ============================================================
-- Poster layout
--
-- Lets the shop position and size a poster visually in the dashboard, and
-- have the website show it exactly the same way.
--
-- One jsonb column holds the lot, so adding another control later needs no
-- further migration:
--
--   {
--     "fit":    "cover" | "contain",   -- fill the slot, or show the whole poster
--     "x":      0..100,                -- which part stays visible when cropped
--     "y":      0..100,
--     "zoom":   1..3,                  -- scale the artwork inside the slot
--     "ratio":  number                 -- slot shape, width / height
--   }
--
-- Paste this whole file into the Supabase SQL editor and Run.
-- Safe to run more than once. It adds a column; it changes no existing data.
-- ============================================================

alter table public.posters
  add column if not exists layout jsonb not null default '{}'::jsonb;

comment on column public.posters.layout is
  'How the poster is framed on the website: fit, focal point x/y, zoom and slot ratio. Set visually from the dashboard. Empty object means use the defaults.';

-- ---------- Check it worked ----------
-- Should return one row: layout | jsonb.

select column_name, data_type
  from information_schema.columns
 where table_schema = 'public'
   and table_name = 'posters'
   and column_name = 'layout';
