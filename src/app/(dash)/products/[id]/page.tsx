import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import ProductForm from "@/components/ProductForm";
import { getBrands, getCategories, getProduct } from "@/lib/products";
import { button, pageTitle } from "@/lib/ui";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const product = await getProduct(id);
  return { title: product ? `Edit ${product.name}` : "Product not found" };
}

const STORE_URL = process.env.STOREFRONT_URL ?? "http://localhost:3000";

export default async function EditProductPage({ params }: Props) {
  const { id } = await params;
  const [product, brands, categories] = await Promise.all([
    getProduct(id),
    getBrands(),
    getCategories(),
  ]);

  if (!product) notFound();

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className={pageTitle}>Edit product</h1>
          <p className="mt-0.5 truncate font-mono text-[13px] text-muted">{product.slug}</p>
        </div>
        <a
          href={`${STORE_URL}/product/${product.slug}`}
          target="_blank"
          rel="noreferrer"
          className={button("outline", "md")}
        >
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
          View on store
        </a>
      </div>
      <div className="mt-5">
        <ProductForm brands={brands} categories={categories} product={product} />
      </div>
    </div>
  );
}
