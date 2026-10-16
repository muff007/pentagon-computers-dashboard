# Pentagon Computers — Admin Dashboard

Staff dashboard for the Pentagon Computers store. It talks to the **same Supabase
project** as the storefront, so anything changed here shows up on the website.

Five pages:

| Page | Route | What it does |
| --- | --- | --- |
| Products | `/products` | Search/filter the catalogue, edit, hide, delete |
| Add product | `/products/new` | Create one product, with an image |
| Bulk upload | `/products/bulk` | Import many products from a zip (spreadsheet + images) |
| Posters | `/posters` | Upload the daily posters that appear on the website |
| Sales tracker | `/sales` | Orders, delivery addresses, fulfilment status, CSV export |

This is a separate app from the storefront — it lives beside it, not inside it.

---

## 1. Setup

```bash
npm install
cp .env.example .env.local     # then fill it in
npm run dev                    # http://localhost:3001
```

`.env.local` (never commit it — it is gitignored):

```
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service role key>
SUPABASE_IMAGE_BUCKET=product-images
SUPABASE_POSTER_BUCKET=posters

ADMIN_USERNAME=<the admin username>
ADMIN_PASSWORD=<the admin password>
SESSION_SECRET=<64 random hex characters>
```

Generate a session secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

> **The service role key bypasses every row-level security policy.** It is only
> ever read on the server — it is never sent to the browser. Keep it out of git,
> and rotate it in Supabase → Settings → API if it is ever exposed.

### Login

There is one account. Its username and password are whatever you set
`ADMIN_USERNAME` and `ADMIN_PASSWORD` to — they are not written down anywhere in
this repository, and they must not be.

Changing the password means changing `ADMIN_PASSWORD` and restarting. Changing
`SESSION_SECRET` signs everyone out immediately.

---

## 2. One-time Supabase setup

### a. The storage bucket

Supabase → Storage → **New bucket** named `product-images`, marked **Public**
(the storefront loads the images directly by URL).

### b. The migration — required for the sales tracker

Open the Supabase **SQL editor** and run
[`supabase/dashboard-migration.sql`](supabase/dashboard-migration.sql). It:

- widens the order status check to allow `packed`, `shipped`, `delivered`, `refunded`
- adds `courier`, `tracking_id`, `staff_note`, `shipped_at`, `delivered_at` to `orders`

Until it is run, `/sales` still lists orders but shows an amber banner and the
fulfilment fields are unavailable.

### c. Posters — required for the Posters page

Run [`supabase/posters.sql`](supabase/posters.sql) in the SQL editor, then
create a **public** storage bucket named `posters`.

Step-by-step walkthrough, including what to do when it goes wrong:
[`supabase/POSTERS-SETUP.md`](supabase/POSTERS-SETUP.md).

---

## 3. Posters

The shop makes new artwork most days. Upload it here and it appears on the
website immediately — no deploy, no developer.

Each poster has a **placement**, which decides where it shows:

| Placement | Where it appears |
| --- | --- |
| Home hero slider | The rotating banner at the top of the home page. The first **3** live posters rotate; add more and they queue behind — reorder to promote one. Wide artwork, around 1600×600. |
| Home page blocks | Dotted between the home page sections, not stacked in one strip. Alternates full-width and inset. |
| Offers page | The `/offers` wall. Add as many as you like — the layout pattern repeats to fit. |
| Best deals page | Above the discounted products on `/deals`. |

Other fields:

- **Link** — optional. Where the poster goes when tapped, e.g.
  `/store?category=laptops`. Leave blank for a plain image.
- **Order** — lower numbers first. Ties fall back to newest first. The ▲▼
  buttons in the list nudge a poster within its placement.
- **Starts / Ends** — optional. Outside these dates the poster hides itself,
  so a festival banner can be loaded a week early and expire on its own.
- **Live** — the on/off switch, also available as the eye icon in the list.

If a placement has no live posters the site handles it quietly: the home page
falls back to its written banner, and `/offers` says **"No offers right now."**

Deleting a poster also deletes its image from storage, so the first click only
arms the button.

---

## 4. Bulk upload — how to prepare the zip

The zip contains **one spreadsheet** plus **the product images**:

```
products.zip
├── products.xlsx            ← .xlsx, .xls or .csv — one sheet, one row per product
├── HP Victus 15 Gaming.jpg
├── ASUS Vivobook 15.png
└── Acer Nitro V 15.webp
```

**Images are matched to rows by filename.** Name each image after the product's
`name` column. Matching ignores capitals, spaces, punctuation and the folder the
image sits in — `HP Victus 15 Gaming.jpg`, `hp-victus-15-gaming.JPG` and
`images/hpvictus15gaming.jpg` all match the row named `HP Victus 15 Gaming`. To
point a row at a specific file instead, put the filename in the `image` column.

Download a pre-made spreadsheet with the right headers from the **Download
spreadsheet template** button on the page.

### Columns

| Column | Required | Notes |
| --- | --- | --- |
| `name` | yes | Product title shown on the store |
| `slug` | no | Generated from the name if blank; made unique automatically |
| `brand` | no | `HP`, `ASUS`, `Acer`, `MSI` — name or slug |
| `category` | no | `Laptops`, `Desktops`, `Printers`, `Monitors`, `Components`, `Accessories` |
| `price` | yes | Rupees. `₹49,999` and `49999` are both fine |
| `mrp` | no | The struck-through price; the discount badge is worked out from it |
| `stock` | no | Defaults to 0 |
| `short_desc` | no | One line, shown on the product card |
| `description` | no | Full paragraph on the product page |
| `specs` | no | One per line as `Label: Value`. JSON also accepted |
| `rating` | no | 0–5 |
| `rating_count` | no | Number of reviews |
| `is_featured` | no | `yes` / `no` — puts it in Best sellers |
| `is_active` | no | `yes` / `no` — defaults to yes |
| `image` | no | Explicit filename, if you don't want name matching |

Header names are matched loosely, so `Product Name`, `product_name` and `name`
all work.

### Re-uploading is safe

Rows are matched on `slug`, so **a row whose slug already exists updates that
product** rather than creating a duplicate. Fix a mistake in the spreadsheet and
upload the whole thing again.

After an import you get a per-row report: created, updated, skipped, and the
exact reason for each failure (`Unknown brand "Dell"`, `Missing or invalid
price`), plus which images were attached, which were missing, and which files in
the zip went unused.

Limits: 60 MB per zip, 8 MB per image, PNG / JPEG / WebP / AVIF.

---

## 5. Sales tracker

Each order shows the customer, the **full delivery address**, the items, and what
was paid. Open an order to:

- move it through `paid → packed → shipped → delivered` (or `refunded` / `cancelled`)
- record the courier and tracking number
- leave a staff note
- copy the address as one block for a shipping label

The headline cards show revenue, revenue in the last 30 days, paid orders, the
dispatch queue and deliveries. **Export CSV** exports exactly what the current
filters show — the file opens in Excel with rupee amounts and addresses intact.

Money is only counted for orders that actually reached `paid` or later; an order
sitting at `created` never made it through Razorpay.

---

## 6. Commands

```bash
npm run dev     # dev server on port 3001
npm run build   # production build
npm run start   # serve the build on 3001
npm run lint
```

The dev and start scripts pin port 3001 so the dashboard and the storefront
(port 3000) can run side by side.

---

## Notes

- Product deletes are blocked when the product appears in an existing order, so
  order history is never orphaned. Hide it instead — the eye icon in the table.
- The dashboard never writes to `orders` totals or `order_items`; it only moves
  fulfilment state. Pricing stays server-side in the storefront.
- Everything is server-rendered with `force-dynamic`, so the tables always
  reflect the database rather than a cached page.
