import type { Metadata } from "next";
import ProductForm from "@/components/ProductForm";
import { getBrands, getCategories } from "@/lib/products";
import { pageTitle } from "@/lib/ui";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Add product" };

export default async function NewProductPage() {
  const [brands, categories] = await Promise.all([getBrands(), getCategories()]);

  return (
    <div>
      <h1 className={pageTitle}>Add product</h1>
      <p className="mt-0.5 text-[13px] text-muted">
        Adds one product to the store. For many at once, use bulk upload.
      </p>
      <div className="mt-5">
        <ProductForm brands={brands} categories={categories} />
      </div>
    </div>
  );
}
