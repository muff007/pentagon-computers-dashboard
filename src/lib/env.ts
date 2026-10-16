import "server-only";

/**
 * Every value here is server-only. Nothing in this file may be imported from a
 * client component — the service-role key bypasses row level security.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    // Deliberately fatal. The dashboard writes to the catalogue and reads
    // every customer's order; starting it half-configured would be worse than
    // not starting at all. The message has to work in both places this is
    // read: a developer's machine, and a hosting dashboard.
    throw new Error(
      `Missing ${name}. Set it in your host's environment variables ` +
        `(Vercel: Settings -> Environment Variables), or locally by copying ` +
        `.env.example to .env.local and filling it in.`,
    );
  }
  return value;
}

export const SUPABASE_URL = required("SUPABASE_URL");
export const SUPABASE_SERVICE_ROLE_KEY = required("SUPABASE_SERVICE_ROLE_KEY");
export const IMAGE_BUCKET = process.env.SUPABASE_IMAGE_BUCKET ?? "product-images";
/** Separate bucket so a poster can never collide with a product slug. */
export const POSTER_BUCKET = process.env.SUPABASE_POSTER_BUCKET ?? "posters";

export const ADMIN_USERNAME = required("ADMIN_USERNAME");
export const ADMIN_PASSWORD = required("ADMIN_PASSWORD");
export const SESSION_SECRET = required("SESSION_SECRET");
