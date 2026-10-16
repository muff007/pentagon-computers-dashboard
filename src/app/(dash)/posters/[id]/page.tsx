import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PosterForm from "@/components/PosterForm";
import { getPoster } from "@/lib/posters";
import { pageTitle } from "@/lib/ui";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const poster = await getPoster(id);
  return { title: poster ? `Edit ${poster.title}` : "Poster not found" };
}

export default async function EditPosterPage({ params }: Props) {
  const { id } = await params;
  const poster = await getPoster(id);

  if (!poster) notFound();

  return (
    <div>
      <h1 className={pageTitle}>Edit poster</h1>
      <p className="mt-0.5 text-[13px] text-muted">{poster.title}</p>
      <PosterForm poster={poster} />
    </div>
  );
}
