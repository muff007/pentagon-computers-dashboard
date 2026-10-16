import type { Metadata } from "next";
import PhotoImport from "@/components/PhotoImport";
import { cardTitle, pageTitle } from "@/lib/ui";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Bulk upload" };

const COLUMNS = [
  ["name", "Required. The product title shown on the store."],
  ["slug", "Optional. Generated from the name when left blank."],
  ["brand", "HP, ASUS, Acer or MSI. Name or slug both work."],
  ["category", "Laptops, Desktops, Printers, Monitors, Components, Accessories."],
  ["price", "Required. Selling price in rupees. ₹ and commas are fine."],
  ["mrp", "Optional. The struck-through price."],
  ["stock", "Units on hand. Defaults to 0."],
  ["short_desc", "One line for the product card."],
  ["description", "Full paragraph for the product page."],
  ["specs", "One per line as Label: Value. JSON also accepted."],
  ["rating", "0 to 5. Optional."],
  ["rating_count", "Number of reviews. Optional."],
  ["is_featured", "yes / no. Puts it in Best sellers."],
  ["is_active", "yes / no. Defaults to yes."],
];

export default function BulkUploadPage() {
  return (
    <div>
      <h1 className={pageTitle}>Bulk upload</h1>
      <p className="mt-0.5 text-[13px] text-muted">
        Add or update many products at once. Upload the details, drag the photos
        onto each product, import.
      </p>

      <div className="mt-5 grid items-start gap-4 lg:grid-cols-[1fr_360px]">
        <PhotoImport />

        <div className="space-y-4">
          <section className="panel overflow-hidden">
            <div className="border-b border-line bg-surface-2 px-4 py-2.5">
              <h2 className={cardTitle}>How it works</h2>
            </div>
            <ol className="space-y-3 p-4 text-[13px] text-muted">
              <li className="flex gap-2.5">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-700 text-[11px] font-bold text-white">
                  1
                </span>
                <span>
                  Upload the zip you already make, or just the spreadsheet. Any
                  images inside are ignored at this step.
                </span>
              </li>
              <li className="flex gap-2.5">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-700 text-[11px] font-bold text-white">
                  2
                </span>
                <span>
                  Every product appears as its own box. Drag its photos onto it
                  straight from the folder &mdash; as many as you like, several
                  at once.
                </span>
              </li>
              <li className="flex gap-2.5">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-700 text-[11px] font-bold text-white">
                  3
                </span>
                <span>
                  The first photo on each product is its cover. Click any other
                  photo to make that one the cover instead.
                </span>
              </li>
            </ol>
            <p className="border-t border-line bg-surface-2 px-4 py-2.5 text-[12px] text-muted">
              Photos are shrunk in your browser before uploading, so a hundred
              camera pictures still go up in one batch and the website stays fast.
            </p>
          </section>

        </div>
      </div>

      <section className="panel mt-4 overflow-hidden">
        <div className="border-b border-line bg-surface-2 px-4 py-2.5">
          <h2 className={cardTitle}>Spreadsheet columns</h2>
        </div>
        <dl className="grid text-[12px] sm:grid-cols-2 xl:grid-cols-3">
          {COLUMNS.map(([name, note]) => (
            <div
              key={name}
              className="border-b border-line px-4 py-2 sm:odd:border-r xl:odd:border-r-0 xl:[&:not(:nth-child(3n))]:border-r"
            >
              <dt className="font-mono font-semibold text-ink-900">{name}</dt>
              <dd className="mt-0.5 text-muted">{note}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
