import "server-only";

import JSZip from "jszip";
import * as XLSX from "xlsx";
import { admin } from "@/lib/supabase";
import { uploadProductImage } from "@/lib/images";
import { parseSpecs, slugify, toBool, toInt, toNumber } from "@/lib/parse";

export const MAX_ZIP_BYTES = 60 * 1024 * 1024;
/** A sheet on its own is tiny; this is only here to reject nonsense. */
export const MAX_SHEET_BYTES = 10 * 1024 * 1024;

const SHEET_EXTENSIONS = [".xlsx", ".xls", ".csv"];

/**
 * Column headers accepted for each field. Compared after lowercasing and
 * stripping everything but letters and digits, so "Short Desc", "short_desc"
 * and "SHORT DESCRIPTION" all land on the same field.
 */
const COLUMNS: Record<string, string[]> = {
  name: ["name", "productname", "product", "title"],
  slug: ["slug", "url", "handle"],
  brand: ["brand", "brandname", "make"],
  category: ["category", "categoryname", "type"],
  price: ["price", "sellingprice", "sale price", "saleprice", "ourprice"],
  mrp: ["mrp", "listprice", "originalprice", "strikeprice"],
  stock: ["stock", "quantity", "qty", "instock"],
  short_desc: ["shortdesc", "shortdescription", "tagline", "summary"],
  description: ["description", "details", "longdescription", "about"],
  specs: ["specs", "specifications", "specification"],
  rating: ["rating", "stars"],
  rating_count: ["ratingcount", "reviews", "reviewcount", "numreviews"],
  is_featured: ["isfeatured", "featured", "bestseller"],
  is_active: ["isactive", "active", "live", "published"],
};

export type RowResult = {
  row: number;
  name: string;
  status: "created" | "updated" | "skipped" | "failed";
  detail: string;
  image: "attached" | "replaced" | "none" | "missing";
};

export type ImportReport = {
  sheetName: string;
  totalRows: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  imagesAttached: number;
  unusedImages: string[];
  /** Extra photos dropped because the gallery column is not there yet. */
  galleryUnavailable?: number;
  results: RowResult[];
};

/** One row as the preview screen sees it, before anything is written. */
export type PreviewRow = {
  /** Spreadsheet row number, header counted. */
  row: number;
  name: string;
  slug: string;
  brand: string | null;
  category: string | null;
  price: number | null;
  /** Why this row cannot be imported, or null when it is fine. */
  problem: string | null;
  /** Something that will happen on import but is not a blocker. */
  note: string | null;
};

export type SheetPreview = {
  sheetName: string;
  rows: PreviewRow[];
};

/** An image handed to the importer for a particular row. */
export type RowImage = { bytes: Uint8Array; contentType: string; label: string };

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Builds header-name → canonical-field lookup for the sheet we were given. */
function mapHeaders(headers: string[]): Map<string, string> {
  const lookup = new Map<string, string>();
  for (const header of headers) {
    const key = norm(header);
    for (const [field, aliases] of Object.entries(COLUMNS)) {
      if (aliases.some((alias) => norm(alias) === key)) {
        lookup.set(header, field);
        break;
      }
    }
  }
  return lookup;
}

function pick(
  row: Record<string, unknown>,
  headerMap: Map<string, string>,
  field: string,
): unknown {
  for (const [header, mapped] of headerMap) {
    if (mapped === field) {
      const value = row[header];
      if (value !== undefined && value !== null && String(value).trim() !== "") {
        return value;
      }
    }
  }
  return undefined;
}

type Sheet = {
  sheetName: string;
  rows: Record<string, unknown>[];
  headerMap: Map<string, string>;
};

/** Reads the first sheet out of an xlsx/xls/csv buffer. */
function readSheet(buffer: ArrayBuffer): Sheet {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) throw new Error("The spreadsheet has no sheets.");

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  });
  if (rows.length === 0) throw new Error("The spreadsheet has no rows.");

  const headerMap = mapHeaders(Object.keys(rows[0]));
  if (![...headerMap.values()].includes("name")) {
    throw new Error(
      `No "name" column found. Columns seen: ${Object.keys(rows[0]).join(", ")}`,
    );
  }

  return { sheetName, rows, headerMap };
}

/**
 * Brand and category name/slug → id, read once per import.
 *
 * A failed read is raised rather than swallowed. Returning an empty map would
 * make every brand look unknown, and a hundred rows would fail with "Unknown
 * brand" when the real problem was the connection.
 */
async function lookups() {
  const client = admin();
  const [brands, categories] = await Promise.all([
    client.from("brands").select("id,slug,name"),
    client.from("categories").select("id,slug,name"),
  ]);

  if (brands.error || categories.error) {
    throw new Error(
      "Could not load the brand and category lists — check your internet connection and try again.",
    );
  }

  const brandBy = new Map<string, string>();
  for (const b of brands.data ?? []) {
    brandBy.set(norm(b.name), b.id);
    brandBy.set(norm(b.slug), b.id);
  }
  const categoryBy = new Map<string, string>();
  for (const c of categories.data ?? []) {
    categoryBy.set(norm(c.name), c.id);
    categoryBy.set(norm(c.slug), c.id);
  }
  return { client, brandBy, categoryBy };
}

/**
 * Finds a brand or category, creating it if the shop has started stocking
 * something new.
 *
 * Refusing a row because the brand is not on a fixed list would mean the first
 * Lenovo delivery fails a hundred rows and someone has to go and add the brand
 * by hand before re-importing. The catalogue follows the stock, not the other
 * way round. Newly created entries are cached so a batch of fifty Lenovos
 * creates exactly one brand.
 */
async function resolveOrCreate(
  client: ReturnType<typeof admin>,
  table: "brands" | "categories",
  cache: Map<string, string>,
  text: string,
): Promise<{ id: string; created: boolean }> {
  const key = norm(text);
  const existing = cache.get(key);
  if (existing) return { id: existing, created: false };

  const slug = slugify(text);

  // Someone may have added it since the lists were read.
  const { data: found } = await client
    .from(table)
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (found) {
    cache.set(key, found.id);
    return { id: found.id, created: false };
  }

  const { data: inserted, error } = await client
    .from(table)
    .insert({ name: text, slug, sort_order: 999 })
    .select("id")
    .single();

  if (error || !inserted) {
    throw new Error(`Could not add "${text}" — ${error?.message ?? "unknown error"}`);
  }

  cache.set(key, inserted.id);
  return { id: inserted.id, created: true };
}

/**
 * Pulls the spreadsheet out of whatever was uploaded.
 *
 * Step 1 accepts the zip the shop already builds — any images inside are
 * ignored, because photos are attached by dragging them onto products in step
 * 2 — and a bare .xlsx/.csv works just as well.
 */
export async function extractSheet(
  buffer: ArrayBuffer,
  filename: string,
): Promise<ArrayBuffer> {
  if (!filename.toLowerCase().endsWith(".zip")) return buffer;

  const zip = await JSZip.loadAsync(buffer);
  const entry = Object.values(zip.files).find(
    (f) =>
      !f.dir &&
      !f.name.split("/").pop()!.startsWith(".") &&
      SHEET_EXTENSIONS.some((ext) => f.name.toLowerCase().endsWith(ext)),
  );

  if (!entry) {
    throw new Error(
      "No spreadsheet found in that zip. It needs one .xlsx, .xls or .csv file inside.",
    );
  }

  return entry.async("arraybuffer");
}

/**
 * Checks a sheet without writing anything.
 *
 * The photo-matching screen calls this first so the shop sees bad prices and
 * unknown brands *before* committing a hundred products, rather than in a
 * report afterwards.
 */
export async function previewSheet(buffer: ArrayBuffer): Promise<SheetPreview> {
  const { sheetName, rows, headerMap } = readSheet(buffer);
  const { brandBy, categoryBy } = await lookups();

  const preview: PreviewRow[] = rows.map((row, index) => {
    const name = String(pick(row, headerMap, "name") ?? "").trim();
    const brand = String(pick(row, headerMap, "brand") ?? "").trim() || null;
    const category = String(pick(row, headerMap, "category") ?? "").trim() || null;
    const price = toNumber(pick(row, headerMap, "price"));
    const slug =
      slugify(String(pick(row, headerMap, "slug") ?? "")) || slugify(name);

    // Only things that genuinely cannot be imported are problems. A brand or
    // category we have not seen before is noted, not refused — it gets created.
    let problem: string | null = null;
    if (!name) problem = "No product name.";
    else if (price === null || price < 0) problem = "Missing or invalid price.";

    const newBrand = Boolean(brand && !brandBy.get(norm(brand)));
    const newCategory = Boolean(category && !categoryBy.get(norm(category)));

    const notes: string[] = [];
    if (newBrand) notes.push(`new brand "${brand}" will be added`);
    if (newCategory) notes.push(`new category "${category}" will be added`);

    return {
      row: index + 2, // +2: sheets are 1-indexed and row 1 is the header
      name: name || "(blank)",
      slug,
      brand,
      category,
      price,
      problem,
      note: notes.length > 0 ? notes.join(", ") : null,
    };
  });

  return { sheetName, rows: preview };
}

/**
 * Writes a sheet into the catalogue.
 *
 * `imageFor` decides which picture belongs to a row, which is the only thing
 * that differs between the two ways of importing: the zip flow matches on
 * filename, the photo-matching flow is told explicitly.
 */
async function importSheet(
  buffer: ArrayBuffer,
  imagesFor: (ctx: {
    rowNumber: number;
    name: string;
    slug: string;
  }) => Promise<RowImage[]> | RowImage[],
): Promise<ImportReport> {
  const { sheetName, rows, headerMap } = readSheet(buffer);
  const { client, brandBy, categoryBy } = await lookups();

  // Galleries need a column that arrives with supabase/product-gallery.sql.
  // Until it is run, import the cover photo and say the extras were dropped —
  // far better than failing every row on a missing column.
  const probe = await client.from("products").select("gallery").limit(1);
  const hasGallery = !(
    probe.error?.code === "42703" ||
    Boolean(probe.error?.message?.includes("does not exist"))
  );
  let droppedExtras = 0;

  const report: ImportReport = {
    sheetName,
    totalRows: rows.length,
    created: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    imagesAttached: 0,
    unusedImages: [],
    results: [],
  };

  for (const [index, row] of rows.entries()) {
    const rowNumber = index + 2;
    const name = String(pick(row, headerMap, "name") ?? "").trim();

    if (!name) {
      report.skipped++;
      report.results.push({
        row: rowNumber,
        name: "(blank)",
        status: "skipped",
        detail: "No product name.",
        image: "none",
      });
      continue;
    }

    try {
      const price = toNumber(pick(row, headerMap, "price"));
      if (price === null || price < 0) throw new Error("Missing or invalid price.");

      const slug =
        slugify(String(pick(row, headerMap, "slug") ?? "")) || slugify(name);

      const brandText = String(pick(row, headerMap, "brand") ?? "").trim();
      const categoryText = String(pick(row, headerMap, "category") ?? "").trim();

      const created: string[] = [];
      let brandId: string | null = null;
      let categoryId: string | null = null;

      if (brandText) {
        const r = await resolveOrCreate(client, "brands", brandBy, brandText);
        brandId = r.id;
        if (r.created) created.push(`brand "${brandText}"`);
      }
      if (categoryText) {
        const r = await resolveOrCreate(client, "categories", categoryBy, categoryText);
        categoryId = r.id;
        if (r.created) created.push(`category "${categoryText}"`);
      }

      const values: Record<string, unknown> = {
        slug,
        name,
        brand_id: brandId,
        category_id: categoryId,
        price,
        mrp: toNumber(pick(row, headerMap, "mrp")),
        stock: toInt(pick(row, headerMap, "stock")),
        short_desc: String(pick(row, headerMap, "short_desc") ?? "").trim() || null,
        description: String(pick(row, headerMap, "description") ?? "").trim() || null,
        specs: parseSpecs(pick(row, headerMap, "specs")),
        rating: toNumber(pick(row, headerMap, "rating")) ?? 0,
        rating_count: toInt(pick(row, headerMap, "rating_count")),
        is_featured: toBool(pick(row, headerMap, "is_featured")),
        is_active: toBool(pick(row, headerMap, "is_active"), true),
      };

      const images = await imagesFor({ rowNumber, name, slug });

      let imageState: RowResult["image"] = "none";
      if (images.length > 0) {
        // The first photo is the cover; the rest become the gallery, uploaded
        // in order so the product page shows them the way they were lined up.
        const wanted = hasGallery ? images : images.slice(0, 1);
        if (!hasGallery && images.length > 1) droppedExtras += images.length - 1;

        const urls: string[] = [];
        for (const [i, image] of wanted.entries()) {
          urls.push(
            await uploadProductImage(slug, image.bytes, image.contentType, i),
          );
        }
        values.image_url = urls[0];
        if (hasGallery) values.gallery = urls.slice(1);
        imageState = "attached";
        report.imagesAttached += wanted.length;
      }

      const { data: existing } = await client
        .from("products")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();

      if (existing) {
        const { error } = await client
          .from("products")
          .update(values)
          .eq("id", existing.id);
        if (error) throw new Error(error.message);
        report.updated++;
        report.results.push({
          row: rowNumber,
          name,
          status: "updated",
          detail: [`Matched existing slug "${slug}".`, created.length ? `Added ${created.join(" and ")}.` : ""].filter(Boolean).join(" "),
          image: imageState === "attached" ? "replaced" : imageState,
        });
      } else {
        const { error } = await client.from("products").insert(values);
        if (error) throw new Error(error.message);
        report.created++;
        report.results.push({
          row: rowNumber,
          name,
          status: "created",
          detail: [`Added as "${slug}".`, created.length ? `Added ${created.join(" and ")}.` : ""].filter(Boolean).join(" "),
          image: imageState,
        });
      }
    } catch (e) {
      report.failed++;
      report.results.push({
        row: rowNumber,
        name,
        status: "failed",
        detail: e instanceof Error ? e.message : "Unknown error.",
        image: "none",
      });
    }
  }

  if (droppedExtras > 0) {
    report.galleryUnavailable = droppedExtras;
  }

  return report;
}

/**
 * The photo-matching flow.
 *
 * The browser has already lined each photo up against a spreadsheet row, so
 * there is no filename matching to do — `photosByRow` says exactly which
 * picture belongs where. This is the path that exists so nobody has to rename
 * a hundred files from the camera roll.
 */
export async function importWithPhotos(
  sheet: ArrayBuffer,
  photosByRow: Map<number, RowImage[]>,
): Promise<ImportReport> {
  const used = new Set<number>();

  const report = await importSheet(sheet, ({ rowNumber }) => {
    const images = photosByRow.get(rowNumber) ?? [];
    if (images.length > 0) used.add(rowNumber);
    return images;
  });

  // Photos pinned to a row that then failed to import are worth surfacing.
  report.unusedImages = [...photosByRow.entries()]
    .filter(([rowNumber]) => !used.has(rowNumber))
    .flatMap(([, images]) => images.map((i) => i.label));

  return report;
}
