import "server-only";

import { IMAGE_BUCKET, admin, publicImageUrl } from "@/lib/supabase";

const ALLOWED = new Map([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/webp", "webp"],
  ["image/avif", "avif"],
  ["image/gif", "gif"],
]);

/** Extension inferred from a filename, for zip entries with no MIME type. */
const BY_EXTENSION = new Map([
  ["png", "image/png"],
  ["jpg", "image/jpeg"],
  ["jpeg", "image/jpeg"],
  ["webp", "image/webp"],
  ["avif", "image/avif"],
  ["gif", "image/gif"],
]);

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export function contentTypeFor(filename: string): string | null {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return BY_EXTENSION.get(ext) ?? null;
}


/**
 * Uploads image bytes and returns the public URL.
 *
 * The object is keyed by product slug, so re-uploading an image for the same
 * product replaces it rather than leaving orphans behind. A cache-busting
 * query is appended because the path stays constant across replacements.
 */
export async function uploadProductImage(
  slug: string,
  bytes: ArrayBuffer | Uint8Array,
  contentType: string,
  /**
   * Where this photo sits for the product. 0 is the cover and keeps the bare
   * slug as its path, so re-importing replaces rather than orphans. Extras take
   * a suffix: a number from the bulk importer, or a unique key from the edit
   * form, where photos are added and removed over time and a positional name
   * would eventually collide with an existing file.
   */
  index: number | string = 0,
): Promise<string> {
  const extension = ALLOWED.get(contentType);
  if (!extension) {
    throw new Error(`Unsupported image type: ${contentType}`);
  }

  const size = bytes instanceof Uint8Array ? bytes.byteLength : bytes.byteLength;
  if (size > MAX_IMAGE_BYTES) {
    throw new Error(
      `Image is ${(size / 1024 / 1024).toFixed(1)}MB — the limit is ${MAX_IMAGE_BYTES / 1024 / 1024}MB.`,
    );
  }

  const objectPath =
    index === 0 ? `${slug}.${extension}` : `${slug}-${index}.${extension}`;
  const body = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);

  const { error } = await admin()
    .storage.from(IMAGE_BUCKET)
    .upload(objectPath, body, { contentType, upsert: true });

  if (error) throw new Error(`Image upload failed: ${error.message}`);

  return `${publicImageUrl(objectPath)}?v=${Date.now()}`;
}

/** Removes a product's image, ignoring the case where there was never one. */
export async function deleteProductImage(imageUrl: string | null): Promise<void> {
  if (!imageUrl || !imageUrl.includes(`/${IMAGE_BUCKET}/`)) return;

  const objectPath = imageUrl.split(`/${IMAGE_BUCKET}/`)[1]?.split("?")[0];
  if (!objectPath) return;

  await admin().storage.from(IMAGE_BUCKET).remove([objectPath]);
}
