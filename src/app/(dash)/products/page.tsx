import type { Metadata } from "next";
import Link from "next/link";
import { Eye, EyeOff, PackagePlus, Pencil, Search } from "lucide-react";
import DeleteProductButton from "@/components/DeleteProductButton";
import Pagination from "@/components/Pagination";
import { getBrands, getCategories, getProductStats, listProducts } from "@/lib/products";
import { toggleActive } from "@/lib/actions/products";
import { formatINR } from "@/lib/format";
import { button, field, fieldInline, pageTitle } from "@/lib/ui";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Products" };

type SearchParams = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const q = one(params.q)?.trim() || undefined;
  const brand = one(params.brand) || undefined;
  const category = one(params.category) || undefined;
  const status = one(params.status) as "active" | "hidden" | undefined;
  const page = Math.max(1, Number(one(params.page) ?? 1) || 1);

  const [{ products, total, pageCount, perPage }, brands, categories, stats] =
    await Promise.all([
      listProducts({ q, brand, category, status, page }),
      getBrands(),
      getCategories(),
      getProductStats(),
    ]);

  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className={pageTitle}>Products</h1>
          <p className="mt-0.5 text-[13px] text-muted">
            {stats.total} total · {stats.hidden} hidden · {stats.outOfStock} out of stock
          </p>
        </div>
        <Link href="/products/new" className={button("primary", "md")}>
          <PackagePlus className="h-4 w-4" aria-hidden="true" />
          Add product
        </Link>
      </div>

      {one(params.created) && (
        <p className="mt-4 rounded-card border border-green-200 bg-green-50 px-3 py-2 text-[13px] text-green-800">
          Product created.
        </p>
      )}

      {one(params.error) === "sold" && (
        <p className="mt-4 rounded-card border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] text-amber-900">
          <strong>Not deleted.</strong> That product appears in an existing
          order, so removing it would break the order history. Hide it from the
          store instead — the eye icon in the Actions column.
        </p>
      )}

      {/* Filters — a plain GET form so the state lives in the URL */}
      <form className="panel mt-4 flex flex-wrap items-end gap-3 p-3" method="get">
        <div className="min-w-52 flex-1">
          <label htmlFor="q" className="sr-only">
            Search products
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle"
              aria-hidden="true"
            />
            <input
              id="q"
              name="q"
              defaultValue={q ?? ""}
              placeholder="Search by name or slug"
              className={`${field} pl-9`}
            />
          </div>
        </div>

        <select name="brand" defaultValue={brand ?? ""} aria-label="Brand" className={fieldInline}>
          <option value="">All brands</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>

        <select
          name="category"
          defaultValue={category ?? ""}
          aria-label="Category"
          className={fieldInline}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <select name="status" defaultValue={status ?? ""} aria-label="Status" className={fieldInline}>
          <option value="">Any status</option>
          <option value="active">Live</option>
          <option value="hidden">Hidden</option>
        </select>

        <button type="submit" className={button("dark", "md")}>
          Apply
        </button>
        <Link href="/products" className={button("ghost", "md")}>
          Reset
        </Link>
      </form>

      {/* Table */}
      <div className="panel mt-4 overflow-hidden">
        {products.length === 0 ? (
          <p className="px-4 py-16 text-center text-[13px] text-muted">
            No products match those filters.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] border-collapse text-[13px]">
              <thead>
                <tr className="table-head border-b border-line text-left text-[11px] uppercase tracking-wider text-subtle">
                  <th className="px-3 py-2.5 font-semibold">Product</th>
                  <th className="px-3 py-2.5 font-semibold">Brand</th>
                  <th className="px-3 py-2.5 font-semibold">Category</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Price</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Stock</th>
                  <th className="px-3 py-2.5 font-semibold">Status</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="border-b border-line last:border-0 hover:bg-surface-2">
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2.5">
                        {p.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={p.image_url}
                            alt=""
                            className="h-9 w-9 shrink-0 rounded-card border border-line object-contain"
                          />
                        ) : (
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-card border border-dashed border-line-strong text-[9px] text-subtle">
                            none
                          </span>
                        )}
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{p.name}</p>
                          <p className="truncate font-mono text-[11px] text-subtle">{p.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-muted">{p.brand?.name ?? "—"}</td>
                    <td className="px-3 py-2.5 text-muted">{p.category?.name ?? "—"}</td>
                    <td className="px-3 py-2.5 text-right font-semibold tabular-nums">
                      {formatINR(p.price)}
                    </td>
                    <td
                      className={`px-3 py-2.5 text-right tabular-nums ${
                        p.stock === 0 ? "font-semibold text-bad" : "text-muted"
                      }`}
                    >
                      {p.stock}
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`inline-flex rounded-sm px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                          p.is_active
                            ? "bg-green-100 text-green-800"
                            : "bg-ink-100 text-ink-600"
                        }`}
                      >
                        {p.is_active ? "Live" : "Hidden"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <form action={toggleActive}>
                          <input type="hidden" name="id" value={p.id} />
                          <input type="hidden" name="next" value={String(!p.is_active)} />
                          <button
                            type="submit"
                            title={p.is_active ? "Hide from the store" : "Show on the store"}
                            className={button("ghost", "sm")}
                          >
                            {p.is_active ? (
                              <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
                            ) : (
                              <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                            )}
                            <span className="sr-only">
                              {p.is_active ? "Hide" : "Show"} {p.name}
                            </span>
                          </button>
                        </form>

                        <Link
                          href={`/products/${p.id}`}
                          className={button("outline", "sm")}
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                          Edit
                        </Link>

                        <DeleteProductButton id={p.id} name={p.name} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {total > 0 && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[13px] text-muted">
            Showing {from}–{to} of {total}
          </p>
          <Pagination page={page} pageCount={pageCount} searchParams={params} basePath="/products" />
        </div>
      )}
    </div>
  );
}
