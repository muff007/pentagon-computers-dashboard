-- ============================================================
--  Dashboard migration
--  Run once in Supabase -> SQL Editor. Safe to re-run.
--
--  Adds the delivery states the sales tracker needs. The storefront only ever
--  set created/paid/failed/cancelled; staff also need to mark an order packed,
--  shipped and delivered.
-- ============================================================

alter table public.orders drop constraint if exists orders_status_check;

alter table public.orders
  add constraint orders_status_check
  check (status in (
    'created',    -- awaiting payment
    'paid',       -- money received, not yet packed
    'packed',     -- ready to hand to the courier
    'shipped',    -- with the courier
    'delivered',  -- signed for
    'failed',
    'cancelled',
    'refunded'
  ));

-- Delivery bookkeeping, all optional.
alter table public.orders add column if not exists courier       text;
alter table public.orders add column if not exists tracking_id   text;
alter table public.orders add column if not exists staff_note    text;
alter table public.orders add column if not exists shipped_at    timestamptz;
alter table public.orders add column if not exists delivered_at  timestamptz;

-- The tracker filters and sorts on these constantly.
create index if not exists orders_status_idx  on public.orders (status);
create index if not exists orders_created_idx on public.orders (created_at desc);

-- ------------------------------------------------------------
--  Storage: product image bucket
--  The dashboard creates this over the API on first run, but here it is as
--  SQL in case you would rather do it by hand.
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

-- Anyone may read a product image; only the service-role key writes them,
-- and that only ever runs inside the dashboard's server code.
drop policy if exists "product images are publicly readable" on storage.objects;
create policy "product images are publicly readable"
  on storage.objects for select
  using (bucket_id = 'product-images');
