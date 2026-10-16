import "server-only";

import { POSTER_BUCKET, admin, publicUrl } from "@/lib/supabase";
import { MAX_IMAGE_BYTES } from "@/lib/images";
import type { Poster, PosterPlacement } from "@/lib/types";

const ALLOWED = new Map([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/webp", "webp"],
  ["image/avif", "avif"],
  ["image/gif", "gif"],
]);

/** Postgres "undefined table" — supabase/posters.sql has not been run yet. */
function isMissingTable(error: { code?: string; message?: string } | null) {
  return (
    error?.code === "42P01" ||
    Boolean(error?.message?.includes("Could not find the table")) ||
    Boolean(error?.message?.includes("does not exist"))
  );
}

/**
 * True once the posters table exists. The page uses this to show a one-time
 * "run the migration" notice instead of an error.
 */
export async function postersReady(): Promise<boolean> {
  const { error } = await admin().from("posters").select("id").limit(1);
  return !isMissingTable(error);
}

export async function listPosters(placement?: PosterPlacement): Promise<Poster[]> {
  let query = admin()
    .from("posters")
    .select("*")
    .order("placement")
    .order("sort_order")
    .order("created_at", { ascending: false });

  if (placement) query = query.eq("placement", placement);

  const { data, error } = await query;
  if (isMissingTable(error)) return [];
  if (error) throw new Error(error.message);

  return (data as Poster[]) ?? [];
}

export async function getPoster(id: string): Promise<Poster | null> {
  const { data } = await admin().from("posters").select("*").eq("id", id).maybeSingle();
  return (data as Poster) ?? null;
}

/** How many posters are live in each placement, for the page header. */
export async function posterCounts(): Promise<Record<string, number>> {
  const { data, error } = await admin()
    .from("posters")
    .select("placement, is_active");

  if (error) return {};

  const counts: Record<string, number> = {};
  for (const row of (data ?? []) as { placement: string; is_active: boolean }[]) {
    if (row.is_active) counts[row.placement] = (counts[row.placement] ?? 0) + 1;
  }
  return counts;
}

/**
 * Uploads a poster image and returns its public URL.
 *
 * Unlike product images these are keyed by a random id rather than a slug —
 * posters have no natural key, and the shop may upload several a day with the
 * same title.
 */
export async function uploadPosterImage(
  file: File,
): Promise<{ url: string; error?: undefined } | { url?: undefined; error: string }> {
  const extension = ALLOWED.get(file.type);
  if (!extension) {
    return { error: "Use a PNG, JPEG, WebP, AVIF or GIF image." };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return {
      error: `Image is ${(file.size / 1024 / 1024).toFixed(1)}MB — the limit is ${
        MAX_IMAGE_BYTES / 1024 / 1024
      }MB.`,
    };
  }

  const objectPath = `${crypto.randomUUID()}.${extension}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error } = await admin()
    .storage.from(POSTER_BUCKET)
    .upload(objectPath, bytes, { contentType: file.type, upsert: false });

  if (error) {
    // The commonest cause by far is the bucket not existing yet.
    return { error: `Upload failed: ${error.message}` };
  }

  return { url: publicUrl(POSTER_BUCKET, objectPath) };
}

/** Removes a poster's image, ignoring one that was never in our bucket. */
export async function deletePosterImage(imageUrl: string | null): Promise<void> {
  if (!imageUrl || !imageUrl.includes(`/${POSTER_BUCKET}/`)) return;

  const objectPath = imageUrl.split(`/${POSTER_BUCKET}/`)[1]?.split("?")[0];
  if (!objectPath) return;

  await admin().storage.from(POSTER_BUCKET).remove([objectPath]);
}
