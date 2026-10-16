import "server-only";

import { admin } from "@/lib/supabase";
import type { Brand, Category, Product } from "@/lib/types";

const SELECT =
  "*, brand:brands(id,slug,name), category:categories(id,slug,name)";

export async function getBrands(): Promise<Brand[]> {
  const { data } = await admin().from("brands").select("id,slug,name").order("sort_order");
  return (data as Brand[]) ?? [];
}

export async function getCategories(): Promise<Category[]> {
  const { data } = await admin()
    .from("categories")
    .select("id,slug,name")
    .order("sort_order");
  return (data as Category[]) ?? [];
}

export type ProductFilters = {
  q?: string;
  brand?: string;
  category?: string;
  status?: "active" | "hidden";
  page?: number;
  perPage?: number;
};

/** PostgREST treats `,` `(` `)` as syntax inside `.or(...)`, so strip them. */
function sanitise(q: string): string {
  return q.replace(/[,()%\\]/g, " ").trim().slice(0, 80);
}

export async function listProducts(filters: ProductFilters = {}) {
  const perPage = filters.perPage ?? 25;
  const page = Math.max(1, filters.page ?? 1);

  let query = admin().from("products").select(SELECT, { count: "exact" });

  if (filters.q) {
    const q = sanitise(filters.q);
    if (q) query = query.or(`name.ilike.%${q}%,slug.ilike.%${q}%`);
  }
  if (filters.brand) query = query.eq("brand_id", filters.brand);
  if (filters.category) query = query.eq("category_id", filters.category);
  if (filters.status === "active") query = query.eq("is_active", true);
  if (filters.status === "hidden") query = query.eq("is_active", false);

  const from = (page - 1) * perPage;
  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range(from, from + perPage - 1);

  if (error) throw new Error(error.message);

  const total = count ?? 0;
  return {
    products: (data as Product[]) ?? [],
    total,
    page,
    perPage,
    pageCount: Math.ceil(total / perPage),
  };
}

export async function getProduct(id: string): Promise<Product | null> {
  const { data } = await admin().from("products").select(SELECT).eq("id", id).maybeSingle();
  return (data as Product) ?? null;
}

/** Counts for the header strip on the products page. */
export async function getProductStats() {
  const client = admin();
  const [all, hidden, outOfStock] = await Promise.all([
    client.from("products").select("id", { count: "exact", head: true }),
    client.from("products").select("id", { count: "exact", head: true }).eq("is_active", false),
    client.from("products").select("id", { count: "exact", head: true }).eq("stock", 0),
  ]);
  return {
    total: all.count ?? 0,
    hidden: hidden.count ?? 0,
    outOfStock: outOfStock.count ?? 0,
  };
}
