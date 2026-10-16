-- ============================================================
-- Product photo galleries
--
-- Products arrive with three or four photos, not one. The existing
-- `image_url` stays as the cover — it is what shows on product cards, in the
-- cart and on invoices — and this adds the rest.
--
-- Paste this whole file into the Supabase SQL editor and Run.
-- Safe to run more than once. It adds a column; it changes no existing data.
-- ============================================================

alter table public.products
  add column if not exists gallery text[] not null default '{}';

comment on column public.products.gallery is
  'Extra photos shown on the product page, in order. The cover photo lives in image_url and is not repeated here.';

-- ---------- Check it worked ----------
-- Should return one row: gallery | ARRAY.

select column_name, data_type
  from information_schema.columns
 where table_schema = 'public'
   and table_name = 'products'
   and column_name = 'gallery';
