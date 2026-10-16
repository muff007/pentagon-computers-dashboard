# Turning on Posters

Two one-off steps. Until both are done, the Posters page shows an amber warning
and uploads fail.

---

## Step 1 — create the table

1. Open your project at **https://supabase.com/dashboard**
2. Left sidebar → **SQL Editor**
3. Click **New query**
4. Open [`posters.sql`](posters.sql), copy **the whole file**, paste it in
5. Click **Run** (or press Ctrl+Enter)

You should see `Success. No rows returned`. That is correct — it creates a table,
it does not return data.

To check it worked: left sidebar → **Table Editor** → you should now see a
`posters` table in the list.

---

## Step 2 — create the storage bucket

The table stores the poster's *details*. The bucket stores the actual *image
file*. You need both.

1. Left sidebar → **Storage**
2. Click **New bucket**
3. Name it exactly:

   ```
   posters
   ```

   Lower case, no spaces, no capital letters. The name must match exactly or
   uploads will fail.

4. **Turn ON the "Public bucket" toggle.**

   This matters. The storefront loads poster images directly by URL — if the
   bucket is private, shoppers get a broken image. Nothing secret goes in this
   bucket; it is artwork you want the public to see.

5. Click **Save** / **Create bucket**

---

## Check it worked

1. Go to the dashboard → **Posters**
2. The amber warning should be gone
3. Click **Add poster**, give it a title, choose any image, pick a placement,
   and save
4. Open the website — the poster should be there

If the warning is still showing, refresh the page; the check runs per page load.

---

## If something goes wrong

**"The posters table does not exist yet"** — Step 1 did not run. Re-run
`posters.sql` in the SQL editor.

**"Upload failed: Bucket not found"** — Step 2 is missing, or the bucket is
named something other than `posters`. Check the spelling in Storage.

**Poster saves, but the image is broken on the website** — the bucket is
private. Storage → click the `posters` bucket → settings → turn **Public** on.

**"new row violates row-level security policy"** — the dashboard is using an
anon key instead of the service-role key. Check `SUPABASE_SERVICE_ROLE_KEY` in
`.env.local` (Supabase → Settings → API → `service_role`, the long secret one).

---

## Using a different bucket name

If you would rather call it something else, create the bucket under that name
and add this line to `.env.local`, then restart the dashboard:

```
SUPABASE_POSTER_BUCKET=your-bucket-name
```
