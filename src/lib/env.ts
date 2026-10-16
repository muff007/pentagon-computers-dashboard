import "server-only";

/**
 * Every value here is server-only. Nothing in this file may be imported from a
 * client component — the service-role key bypasses row level security.
 */

/**
 * Read a required variable, failing loudly if it is not configured.
 *
 * These are functions rather than module-level constants on purpose. A build
 * imports every route module to collect its config, so a constant that throws
 * here would fail the build on a host where the variables are only injected at
 * runtime — even though nothing in the build actually needs their values.
 * Reading them lazily keeps the build independent of the secrets, and still
 * fails the very first request if one is missing.
 */
function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    // Deliberately fatal. The dashboard writes to the catalogue and reads
    // every customer's order; serving it half-configured would be worse than
    // not serving it at all. The message has to work in both places this is
    // read: a developer's machine, and a hosting dashboard.
    throw new Error(
      `Missing ${name}. Set it in your host's environment variables ` +
        `(Vercel: Settings -> Environment Variables), or locally by copying ` +
        `.env.example to .env.local and filling it in.`,
    );
  }
  return value;
}

export const supabaseUrl = () => required("SUPABASE_URL");
export const supabaseServiceRoleKey = () => required("SUPABASE_SERVICE_ROLE_KEY");

// Bucket names have working defaults, so they cannot fail a build.
export const IMAGE_BUCKET = process.env.SUPABASE_IMAGE_BUCKET ?? "product-images";
/** Separate bucket so a poster can never collide with a product slug. */
export const POSTER_BUCKET = process.env.SUPABASE_POSTER_BUCKET ?? "posters";

export const adminUsername = () => required("ADMIN_USERNAME");
export const adminPassword = () => required("ADMIN_PASSWORD");
export const sessionSecret = () => required("SESSION_SECRET");
