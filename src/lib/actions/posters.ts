"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { admin } from "@/lib/supabase";
import { deletePosterImage, getPoster, uploadPosterImage } from "@/lib/posters";
import { isSignedIn } from "@/lib/session";
import { POSTER_PLACEMENTS, type PosterPlacement } from "@/lib/types";

/** The layout column arrives with supabase/poster-layout.sql. */
function isMissingLayout(error: { code?: string; message?: string } | null) {
  return (
    error?.code === "42703" ||
    Boolean(error?.message?.includes("layout"))
  );
}

/** Parses the editor's JSON, falling back to nothing rather than throwing. */
function parseLayout(value: FormDataEntryValue | null): Record<string, unknown> | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export type PosterFormState = { error?: string };

/** Server actions are reachable by anyone who knows the endpoint. */
async function requireAdmin() {
  if (!(await isSignedIn())) throw new Error("Not signed in.");
}

function placementOf(value: FormDataEntryValue | null): PosterPlacement {
  const v = String(value ?? "");
  return (POSTER_PLACEMENTS as readonly string[]).includes(v)
    ? (v as PosterPlacement)
    : "home";
}

/**
 * The shop is in India and schedules posters in IST.
 *
 * <input type="datetime-local"> posts wall-clock time with no timezone at all,
 * e.g. "2026-10-17T19:21". new Date() then reads that in whatever timezone the
 * *server* runs in, which on Vercel is UTC — so a poster set for 7:21 pm went
 * live at 00:51 the following morning, five and a half hours late, and the
 * shop simply saw a poster that never appeared.
 *
 * Stamping IST on it makes the field mean the same thing wherever this runs.
 * A blank input posts "", which has to become null rather than an epoch.
 */
const IST_OFFSET = "+05:30";

function dateOrNull(value: FormDataEntryValue | null): string | null {
  const v = String(value ?? "").trim();
  if (!v) return null;

  // Anything that already carries an offset is trusted as-is.
  const hasZone = /(?:Z|[+-]\d{2}:\d{2})$/i.test(v);
  // datetime-local omits seconds; Date wants them before an offset.
  const withSeconds = v.length === 16 ? `${v}:00` : v;
  const stamped = hasZone ? v : `${withSeconds}${IST_OFFSET}`;

  const d = new Date(stamped);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export async function createPoster(
  _prev: PosterFormState,
  formData: FormData,
): Promise<PosterFormState> {
  await requireAdmin();

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "Give the poster a title so you can find it later." };

  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a poster image." };
  }

  const upload = await uploadPosterImage(file);
  if (upload.error) return { error: upload.error };

  const base: Record<string, unknown> = {
    title,
    image_url: upload.url,
    link_url: String(formData.get("link_url") ?? "").trim() || null,
    placement: placementOf(formData.get("placement")),
    sort_order: Number(formData.get("sort_order") ?? 0) || 0,
    is_active: formData.get("is_active") === "on",
    starts_at: dateOrNull(formData.get("starts_at")),
    ends_at: dateOrNull(formData.get("ends_at")),
  };
  const layout = parseLayout(formData.get("layout"));

  let { error } = await admin()
    .from("posters")
    .insert(layout ? { ...base, layout } : base);

  // Before supabase/poster-layout.sql is run there is nowhere to put the
  // framing; save the poster anyway rather than losing the upload.
  // Saving the poster matters more than the framing, so fall back rather than
  // lose the upload — but the shop has to be told, or it spends an afternoon
  // arranging a poster that silently reverts to the defaults every time.
  let layoutDropped = false;
  if (error && layout && isMissingLayout(error)) {
    layoutDropped = true;
    ({ error } = await admin().from("posters").insert(base));
  }

  if (error) {
    // Do not leave the uploaded file orphaned in storage.
    await deletePosterImage(upload.url ?? null);
    return {
      error: error.message.includes("Could not find the table")
        ? "The posters table does not exist yet — run supabase/posters.sql first."
        : error.message,
    };
  }

  revalidatePath("/posters");
  redirect(layoutDropped ? "/posters?created=1&layout=missing" : "/posters?created=1");
}

export async function updatePoster(
  _prev: PosterFormState,
  formData: FormData,
): Promise<PosterFormState> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing poster." };

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "Give the poster a title." };

  const values: Record<string, unknown> = {
    title,
    link_url: String(formData.get("link_url") ?? "").trim() || null,
    placement: placementOf(formData.get("placement")),
    sort_order: Number(formData.get("sort_order") ?? 0) || 0,
    is_active: formData.get("is_active") === "on",
    starts_at: dateOrNull(formData.get("starts_at")),
    ends_at: dateOrNull(formData.get("ends_at")),
  };

  // Replacing the artwork is optional; an empty file input means "keep it".
  const file = formData.get("image");
  if (file instanceof File && file.size > 0) {
    const upload = await uploadPosterImage(file);
    if (upload.error) return { error: upload.error };

    const existing = await getPoster(id);
    values.image_url = upload.url;
    await deletePosterImage(existing?.image_url ?? null);
  }

  const layout = parseLayout(formData.get("layout"));
  if (layout) values.layout = layout;

  let { error } = await admin().from("posters").update(values).eq("id", id);

  let layoutDropped = false;
  if (error && layout && isMissingLayout(error)) {
    layoutDropped = true;
    delete values.layout;
    ({ error } = await admin().from("posters").update(values).eq("id", id));
  }

  if (error) return { error: error.message };

  revalidatePath("/posters");
  revalidatePath(`/posters/${id}`);
  redirect(layoutDropped ? "/posters?saved=1&layout=missing" : "/posters?saved=1");
}

export async function deletePoster(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const poster = await getPoster(id);
  await admin().from("posters").delete().eq("id", id);
  await deletePosterImage(poster?.image_url ?? null);

  revalidatePath("/posters");
}

/** Quick on/off from the list, without opening the form. */
export async function togglePoster(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const next = String(formData.get("next") ?? "") === "true";
  if (!id) return;

  await admin().from("posters").update({ is_active: next }).eq("id", id);
  revalidatePath("/posters");
}

/** Nudges a poster up or down within its placement. */
export async function movePoster(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const direction = String(formData.get("direction") ?? "");
  if (!id || (direction !== "up" && direction !== "down")) return;

  const poster = await getPoster(id);
  if (!poster) return;

  const step = direction === "up" ? -1 : 1;
  await admin()
    .from("posters")
    .update({ sort_order: poster.sort_order + step })
    .eq("id", id);

  revalidatePath("/posters");
}
