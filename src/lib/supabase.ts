import "server-only";

import { createClient } from "@supabase/supabase-js";
import {
  IMAGE_BUCKET,
  POSTER_BUCKET,
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_URL,
} from "@/lib/env";

/**
 * Service-role client. Bypasses row level security, which is what lets the
 * dashboard edit the catalogue and read every customer's order. Only ever call
 * this from server code.
 */
export function admin() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Public URL for an object already uploaded to the image bucket. */
export function publicImageUrl(objectPath: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/${IMAGE_BUCKET}/${objectPath}`;
}

/** Public URL for an object in any bucket. */
export function publicUrl(bucket: string, objectPath: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${objectPath}`;
}

export { IMAGE_BUCKET, POSTER_BUCKET };
