import type { Metadata } from "next";
import PosterForm from "@/components/PosterForm";
import { pageTitle } from "@/lib/ui";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Add poster" };

export default function NewPosterPage() {
  return (
    <div>
      <h1 className={pageTitle}>Add poster</h1>
      <p className="mt-0.5 text-[13px] text-muted">
        Upload today&rsquo;s artwork and choose where on the site it appears.
      </p>
      <PosterForm />
    </div>
  );
}
