"use client";

import PosterFrame from "@/components/PosterFrame";
import type { PosterLayout, PosterPlacement } from "@/lib/types";

/**
 * The poster in place on a miniature of the real page.
 *
 * Deliberately built from the storefront's own colours, type and furniture —
 * blue utility strip, black nav with the yellow deals tab, yellow-underlined
 * section headings, bordered product cards with blue prices — because a mock
 * that does not look like the site tells the shop nothing useful.
 */

export default function PosterPreview({
  src,
  placement,
  layout,
}: {
  src: string;
  placement: PosterPlacement;
  layout: PosterLayout;
}) {
  // The very same renderer the storefront uses, so the preview cannot drift
  // from reality.
  const poster = <PosterFrame src={src} layout={layout} />;

  return (
    <div className="overflow-hidden rounded-card border border-line bg-white shadow-sm">
      <Chrome />

      {placement === "hero" && (
        <>
          {poster}
          <OfferStrip />
          <Section title="Shop by category">
            <Categories />
          </Section>
        </>
      )}

      {placement === "home" && (
        <>
          <Hero />
          <OfferStrip />
          <Section title="Shop by category">
            <Categories />
          </Section>
          <div className="px-3 pb-1">{poster}</div>
          <Section title="Best sellers">
            <Products />
          </Section>
        </>
      )}

      {placement === "offers" && (
        <>
          <div className="px-3 pt-3">
            <h3 className="text-[9px] font-bold text-ink-900">Offers</h3>
            <div className="mt-0.5 h-0.5 w-5 bg-deal" />
            <p className="mt-1 text-[6px] text-ink-600">
              Everything running right now across both counters.
            </p>
          </div>
          <div className="px-3 pb-3 pt-2">
            {poster}
            <div className="mt-1.5 grid grid-cols-3 gap-1.5">
              {[20, 28, 16].map((h, i) => (
                <div key={i} style={{ height: h }} className="bg-ink-100" />
              ))}
            </div>
          </div>
        </>
      )}

      {placement === "deals" && (
        <>
          <div className="px-3 pt-3">
            <h3 className="text-[9px] font-bold text-ink-900">Best deals</h3>
            <div className="mt-0.5 h-0.5 w-5 bg-deal" />
          </div>
          <div className="px-3 pb-1 pt-2">{poster}</div>
          <div className="px-3 pb-3">
            <Products />
          </div>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------- page furniture */

function Chrome() {
  return (
    <>
      <div className="flex items-center justify-between bg-brand-700 px-2 py-[3px] text-[5px] text-white">
        <span className="flex items-center gap-1">
          <span className="bg-deal px-1 font-bold text-ink-900">
            Authorised partner
          </span>
          HP · ASUS · Acer · MSI
        </span>
        <span>Madurai · Sivakasi</span>
      </div>

      <div className="flex items-center gap-1.5 px-2 py-1.5">
        <span className="grid h-4 w-4 shrink-0 place-items-center bg-brand-700 text-[5px] font-bold text-white">
          P
        </span>
        <span className="text-[7px] font-extrabold leading-none text-ink-900">
          PENTAGON
          <span className="block text-[4px] font-bold tracking-widest text-brand-700">
            COMPUTERS
          </span>
        </span>
        <span className="ml-1.5 h-3 flex-1 rounded-[1px] border border-line bg-white" />
        <span className="h-3 w-4 bg-brand-700" />
        <span className="h-3 w-5 rounded-[1px] bg-brand-700" />
      </div>

      <div className="flex items-stretch bg-ink-900 text-[5px] text-white">
        {["Home", "Store", "About", "Offers", "Compare"].map((t, i) => (
          <span key={t} className={`px-1.5 py-1 ${i === 0 ? "bg-brand-700" : ""}`}>
            {t}
          </span>
        ))}
        <span className="ml-auto bg-deal px-1.5 py-1 font-bold text-ink-900">
          Best Deals
        </span>
      </div>
    </>
  );
}

function OfferStrip() {
  return (
    <div className="flex justify-center gap-3 bg-ink-900 px-2 py-[3px] text-[5px] text-white">
      <span>
        <strong className="text-deal">Free delivery</strong> over ₹5,000
      </span>
      <span>
        <strong className="text-deal">GST invoice</strong> on every order
      </span>
    </div>
  );
}

function Hero() {
  return (
    <div className="border-b-2 border-deal bg-brand-700 px-2 py-3 text-center">
      <span className="bg-deal px-1 text-[4px] font-bold text-ink-900">
        Authorised HP · ASUS · Acer · MSI
      </span>
      <p className="mt-1 text-[8px] font-bold leading-tight text-white">
        Laptops, printers and everything in between
      </p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="px-3 py-2">
      <div className="flex flex-col items-center">
        <span className="text-[7px] font-bold text-ink-900">{title}</span>
        <span className="mt-0.5 h-0.5 w-4 bg-deal" />
      </div>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

const TINTS = ["#eaf1fd", "#fef6e0", "#e9f7ef", "#fdeceb", "#f0ebfa", "#e6f5f8"];

function Categories() {
  return (
    <div className="grid grid-cols-6 gap-1">
      {TINTS.map((bg, i) => (
        <div key={i}>
          <div style={{ background: bg }} className="aspect-square border border-line" />
          <div className="mx-auto mt-0.5 h-[2px] w-3/4 bg-ink-200" />
        </div>
      ))}
    </div>
  );
}

function Products() {
  return (
    <div className="grid grid-cols-4 gap-1">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="border border-line p-[3px]">
          <div className="relative aspect-square bg-surface-2">
            {i % 2 === 0 && (
              <span className="absolute left-0 top-0 bg-sale px-[2px] text-[3px] font-bold text-white">
                Sale!
              </span>
            )}
          </div>
          <div className="mt-0.5 h-[2px] w-full bg-ink-200" />
          <div className="mt-[2px] h-[2px] w-2/3 bg-brand-700" />
          <div className="mt-[3px] flex gap-[2px]">
            <span className="h-[5px] flex-1 bg-ink-900" />
            <span className="h-[5px] flex-1 bg-ink-100" />
          </div>
        </div>
      ))}
    </div>
  );
}
