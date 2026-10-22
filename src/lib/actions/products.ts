"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { admin } from "@/lib/supabase";
import { deleteProductImage, uploadProductImage } from "@/lib/images";
import { parseSpecs, slugify, toBool, toInt, toNumber } from "@/lib/parse";
import { isSignedIn } from "@/lib/session";

export type ProductFormState = { error?: string; success?: string };

/**
 * Works out a product's photos from the editor's ordered list.
 *
 * The list interleaves photos already on the product with newly chosen files,
 * so a photo added in this edit can be made the cover. New files are keyed by
 * a random suffix rather than a position, because positions get reused as
 * photos come and go and would eventually overwrite an existing file.
 *
 * Returns null when the form carried no photo editor, so callers leave the
 * product's photos untouched.
 */
async function resolvePhotos(
  formData: FormData,
  slug: string,
): Promise<{ cover: string | null; gallery: string[] } | null> {
  const raw = formData.get("photo_order");
  if (typeof raw !== "string") return null;

  let order: string[];
  try {
    const parsed = JSON.parse(raw);
    order = Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return null;
  }

  const files = formData
    .getAll("new_photos")
    .filter((f): f is File => f instanceof File && f.size > 0);

  const urls: string[] = [];
  for (const entry of order) {
    if (entry.startsWith("existing:")) {
      urls.push(entry.slice("existing:".length));
      continue;
    }
    if (entry.startsWith("new:")) {
      const file = files[Number(entry.slice("new:".length))];
      if (!file) continue;
      const key = crypto.randomUUID().slice(0, 8);
      urls.push(
        await uploadProductImage(slug, await file.arrayBuffer(), file.type, key),
      );
    }
  }

  return { cover: urls[0] ?? null, gallery: urls.slice(1) };
}

/** Removes photos the editor dropped, so storage does not fill with orphans. */
async function deleteRemoved(previous: string[], kept: string[]) {
  const keep = new Set(kept);
  for (const url of previous) {
    if (url && !keep.has(url)) await deleteProductImage(url);
  }
}


/**
 * Every mutation re-checks the session. Server actions are reachable by anyone
 * who knows the endpoint, so the layout guard alone is not enough.
 */
async function requireAdmin() {
  if (!(await isSignedIn())) throw new Error("Not signed in.");
}

/** Finds a slug not already taken, appending -2, -3 … when needed. */
async function uniqueSlug(base: string, ignoreId?: string): Promise<string> {
  const root = slugify(base) || "product";

  for (let attempt = 0; attempt < 50; attempt++) {
    const candidate = attempt === 0 ? root : `${root}-${attempt + 1}`;
    let query = admin().from("products").select("id").eq("slug", candidate);
    if (ignoreId) query = query.neq("id", ignoreId);
    const { data } = await query.maybeSingle();
    if (!data) return candidate;
  }

  return `${root}-${Date.now().toString(36)}`;
}

type Parsed = {
  values: Record<string, unknown>;
  slug: string;
  imageFile: File | null;
  error?: string;
};

async function readForm(formData: FormData, existingId?: string): Promise<Parsed> {
  const name = String(formData.get("name") ?? "").trim();
  const price = toNumber(formData.get("price"));

  if (name.length < 2) {
    return { values: {}, slug: "", imageFile: null, error: "Enter a product name." };
  }
  if (price === null || price < 0) {
    return { values: {}, slug: "", imageFile: null, error: "Enter a valid price." };
  }

  const mrp = toNumber(formData.get("mrp"));
  if (mrp !== null && mrp < price) {
    return {
      values: {},
      slug: "",
      imageFile: null,
      error: "MRP cannot be lower than the selling price.",
    };
  }

  const typedSlug = String(formData.get("slug") ?? "").trim();
  const slug = await uniqueSlug(typedSlug || name, existingId);

  const brandId = String(formData.get("brand_id") ?? "").trim();
  const categoryId = String(formData.get("category_id") ?? "").trim();
  const file = formData.get("image");

  return {
    slug,
    imageFile: file instanceof File && file.size > 0 ? file : null,
    values: {
      name,
      slug,
      brand_id: brandId || null,
      category_id: categoryId || null,
      price,
      mrp,
      stock: toInt(formData.get("stock")),
      short_desc: String(formData.get("short_desc") ?? "").trim() || null,
      description: String(formData.get("description") ?? "").trim() || null,
      specs: parseSpecs(formData.get("specs")),
      rating: toNumber(formData.get("rating")) ?? 0,
      rating_count: toInt(formData.get("rating_count")),
      is_featured: toBool(formData.get("is_featured")),
      is_active: toBool(formData.get("is_active"), true),
    },
  };
}

export async function createProduct(
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  await requireAdmin();

  const parsed = await readForm(formData);
  if (parsed.error) return { error: parsed.error };

  const values = { ...parsed.values } as Record<string, unknown>;

  try {
    const photos = await resolvePhotos(formData, parsed.slug);
    if (photos) {
      values.image_url = photos.cover;
      values.gallery = photos.gallery;
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Image upload failed." };
  }

  const { error } = await admin().from("products").insert(values);
  if (error) return { error: error.message };

  revalidatePath("/products");
  redirect("/products?created=1");
}

export async function updateProduct(
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Missing product id." };

  const parsed = await readForm(formData, id);
  if (parsed.error) return { error: parsed.error };

  const values = { ...parsed.values } as Record<string, unknown>;

  try {
    const photos = await resolvePhotos(formData, parsed.slug);
    if (photos) {
      const { data: before } = await admin()
        .from("products")
        .select("image_url, gallery")
        .eq("id", id)
        .maybeSingle();

      values.image_url = photos.cover;
      values.gallery = photos.gallery;

      const previous = [
        before?.image_url ?? null,
        ...((before?.gallery as string[] | null) ?? []),
      ].filter((u): u is string => Boolean(u));

      await deleteRemoved(previous, [
        ...(photos.cover ? [photos.cover] : []),
        ...photos.gallery,
      ]);
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Image upload failed." };
  }

  const { error } = await admin().from("products").update(values).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/products");
  revalidatePath(`/products/${id}`);
  return { success: "Saved." };
}

export async function deleteProduct(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  // Deleting a sold product used to be refused, to protect order history. That
  // was unnecessary: order_items keeps its own copy of the name, price, image
  // and quantity, and product_id is "on delete set null", so an invoice is
  // unchanged by this — it simply stops pointing at a catalogue entry that no
  // longer exists. The shop needs to be able to clear out old stock.
  const { data } = await admin()
    .from("products")
    .select("image_url, gallery")
    .eq("id", id)
    .maybeSingle();

  await admin().from("products").delete().eq("id", id);

  // Cover and gallery both, or the extra photos sit in storage for ever with
  // nothing left pointing at them.
  const gallery = Array.isArray(data?.gallery) ? (data.gallery as string[]) : [];
  for (const url of [data?.image_url ?? null, ...gallery]) {
    await deleteProductImage(url);
  }

  revalidatePath("/products");
}

/** Quick toggle from the table, without opening the edit form. */
export async function toggleActive(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const next = String(formData.get("next") ?? "") === "true";
  if (!id) return;

  await admin().from("products").update({ is_active: next }).eq("id", id);
  revalidatePath("/products");
}
