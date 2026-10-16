"use client";

import Link from "next/link";
import { useActionState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import {
  createProduct,
  updateProduct,
  type ProductFormState,
} from "@/lib/actions/products";
import ProductPhotos from "@/components/ProductPhotos";
import { specsToLines } from "@/lib/parse";
import { button, cardTitle, field, label } from "@/lib/ui";
import type { Brand, Category, Product } from "@/lib/types";

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="panel overflow-hidden">
      <div className="border-b border-line bg-surface-2 px-4 py-2.5">
        <h2 className={cardTitle}>{title}</h2>
        {hint && <p className="mt-0.5 text-[11px] text-muted">{hint}</p>}
      </div>
      <div className="grid gap-4 p-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

export default function ProductForm({
  brands,
  categories,
  product,
}: {
  brands: Brand[];
  categories: Category[];
  /** Present when editing; absent when creating. */
  product?: Product;
}) {
  const editing = Boolean(product);
  const [state, formAction, pending] = useActionState<ProductFormState, FormData>(
    editing ? updateProduct : createProduct,
    {},
  );

  return (
    <form action={formAction} className="space-y-4">
      {editing && <input type="hidden" name="id" value={product!.id} />}

      {state.error && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-card border border-red-200 bg-red-50 px-3 py-2.5 text-[13px] text-red-800"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {state.error}
        </p>
      )}
      {state.success && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-card border border-green-200 bg-green-50 px-3 py-2.5 text-[13px] text-green-800"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          {state.success}
        </p>
      )}

      <Section title="Basics">
        <div className="sm:col-span-2">
          <label htmlFor="name" className={label}>
            Product name *
          </label>
          <input
            id="name"
            name="name"
            required
            defaultValue={product?.name}
            placeholder="HP Victus 15 Gaming"
            className={`${field} mt-1.5`}
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="slug" className={label}>
            URL slug
          </label>
          <input
            id="slug"
            name="slug"
            defaultValue={product?.slug}
            placeholder="Left blank, this is generated from the name"
            className={`${field} mt-1.5 font-mono`}
          />
          <p className="mt-1 text-[11px] text-muted">
            The web address for this product. Made unique automatically if taken.
          </p>
        </div>

        <div>
          <label htmlFor="brand_id" className={label}>
            Brand
          </label>
          <select
            id="brand_id"
            name="brand_id"
            defaultValue={product?.brand_id ?? ""}
            className={`${field} mt-1.5`}
          >
            <option value="">No brand</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="category_id" className={label}>
            Category
          </label>
          <select
            id="category_id"
            name="category_id"
            defaultValue={product?.category_id ?? ""}
            className={`${field} mt-1.5`}
          >
            <option value="">No category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </Section>

      <Section title="Price and stock">
        <div>
          <label htmlFor="price" className={label}>
            Selling price (₹) *
          </label>
          <input
            id="price"
            name="price"
            type="number"
            min={0}
            step="0.01"
            required
            defaultValue={product?.price}
            className={`${field} mt-1.5`}
          />
        </div>

        <div>
          <label htmlFor="mrp" className={label}>
            MRP (₹)
          </label>
          <input
            id="mrp"
            name="mrp"
            type="number"
            min={0}
            step="0.01"
            defaultValue={product?.mrp ?? ""}
            className={`${field} mt-1.5`}
          />
          <p className="mt-1 text-[11px] text-muted">
            Shown struck through. The discount badge is worked out from it.
          </p>
        </div>

        <div>
          <label htmlFor="stock" className={label}>
            Stock on hand
          </label>
          <input
            id="stock"
            name="stock"
            type="number"
            min={0}
            defaultValue={product?.stock ?? 0}
            className={`${field} mt-1.5`}
          />
        </div>

        <div className="flex items-end gap-5 pb-1">
          <label className="flex cursor-pointer items-center gap-2 text-[13px]">
            <input
              type="checkbox"
              name="is_active"
              defaultChecked={product?.is_active ?? true}
              className="h-4 w-4 accent-brand-700"
            />
            Live on the store
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-[13px]">
            <input
              type="checkbox"
              name="is_featured"
              defaultChecked={product?.is_featured ?? false}
              className="h-4 w-4 accent-brand-700"
            />
            Best seller
          </label>
        </div>
      </Section>

      <Section title="Description">
        <div className="sm:col-span-2">
          <label htmlFor="short_desc" className={label}>
            Short description
          </label>
          <input
            id="short_desc"
            name="short_desc"
            defaultValue={product?.short_desc ?? ""}
            placeholder="One line, shown on the product card"
            className={`${field} mt-1.5`}
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="description" className={label}>
            Full description
          </label>
          <textarea
            id="description"
            name="description"
            rows={5}
            defaultValue={product?.description ?? ""}
            className={`${field} mt-1.5 resize-y`}
          />
        </div>
      </Section>

      <Section
        title="Specifications"
        hint="One per line as Label: Value. These fill the spec table and the compare page."
      >
        <div className="sm:col-span-2">
          <label htmlFor="specs" className="sr-only">
            Specifications
          </label>
          <textarea
            id="specs"
            name="specs"
            rows={8}
            defaultValue={specsToLines(product?.specs)}
            placeholder={"Processor: Intel Core i5-13420H\nRAM: 16GB DDR4\nStorage: 512GB NVMe SSD"}
            className={`${field} mt-1.5 resize-y font-mono text-xs`}
          />
        </div>
      </Section>

      <Section
        title="Photos"
        hint="The first photo is the cover. The rest show on the product page."
      >
        <ProductPhotos
          cover={product?.image_url ?? null}
          gallery={product?.gallery ?? []}
        />
      </Section>

      <Section title="Rating" hint="Optional. Shown as stars on the product card.">
        <div>
          <label htmlFor="rating" className={label}>
            Rating out of 5
          </label>
          <input
            id="rating"
            name="rating"
            type="number"
            min={0}
            max={5}
            step="0.1"
            defaultValue={product?.rating ?? 0}
            className={`${field} mt-1.5`}
          />
        </div>
        <div>
          <label htmlFor="rating_count" className={label}>
            Number of reviews
          </label>
          <input
            id="rating_count"
            name="rating_count"
            type="number"
            min={0}
            defaultValue={product?.rating_count ?? 0}
            className={`${field} mt-1.5`}
          />
        </div>
      </Section>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={button("primary", "lg")}>
          {pending ? "Saving…" : editing ? "Save changes" : "Create product"}
        </button>
        <Link href="/products" className={button("outline", "lg")}>
          Back to products
        </Link>
      </div>
    </form>
  );
}
