import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  ImagePlus,
  Pencil,
} from "lucide-react";
import DeletePosterButton from "@/components/DeletePosterButton";
import { listPosters, posterCounts, postersReady } from "@/lib/posters";
import { movePoster, togglePoster } from "@/lib/actions/posters";
import { formatDate } from "@/lib/format";
import { button, cardTitle, pageTitle } from "@/lib/ui";
import {
  PLACEMENT_HINTS,
  PLACEMENT_LABELS,
  POSTER_PLACEMENTS,
  type Poster,
} from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Posters" };

type SearchParams = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Whether a poster is inside its run dates right now. */
function scheduleNote(poster: Poster): string | null {
  const now = Date.now();
  if (poster.starts_at && new Date(poster.starts_at).getTime() > now) {
    return `Scheduled for ${formatDate(poster.starts_at)}`;
  }
  if (poster.ends_at && new Date(poster.ends_at).getTime() < now) {
    return `Ended ${formatDate(poster.ends_at)}`;
  }
  if (poster.ends_at) return `Until ${formatDate(poster.ends_at)}`;
  return null;
}

export default async function PostersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const [posters, counts, ready] = await Promise.all([
    listPosters(),
    posterCounts(),
    postersReady(),
  ]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className={pageTitle}>Posters</h1>
          <p className="mt-0.5 text-[13px] text-muted">
            {posters.length} total · shown on the website as soon as they are live
          </p>
        </div>
        <Link href="/posters/new" className={button("primary", "md")}>
          <ImagePlus className="h-4 w-4" aria-hidden="true" />
          Add poster
        </Link>
      </div>

      {!ready && (
        <p className="mt-4 flex items-start gap-2.5 rounded-card border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            <strong>Two setup steps left.</strong>
            <br />
            <strong>1.</strong> Supabase → SQL Editor → New query → paste all of{" "}
            <code className="rounded bg-amber-100 px-1 font-mono text-[11px]">
              supabase/posters.sql
            </code>{" "}
            → Run.
            <br />
            <strong>2.</strong> Supabase → Storage → New bucket → name it{" "}
            <code className="rounded bg-amber-100 px-1 font-mono text-[11px]">
              posters
            </code>{" "}
            and turn <strong>Public bucket</strong> on.
            <br />
            Full walkthrough in{" "}
            <code className="rounded bg-amber-100 px-1 font-mono text-[11px]">
              supabase/POSTERS-SETUP.md
            </code>
            . Uploads fail until both exist.
          </span>
        </p>
      )}

      {one(params.created) && (
        <p className="mt-4 rounded-card border border-green-200 bg-green-50 px-3 py-2 text-[13px] text-green-800">
          Poster added.
        </p>
      )}
      {one(params.saved) && (
        <p className="mt-4 rounded-card border border-green-200 bg-green-50 px-3 py-2 text-[13px] text-green-800">
          Poster saved.
        </p>
      )}

      {/* Grouped by placement, so it is obvious what appears where. */}
      <div className="mt-5 space-y-5">
        {POSTER_PLACEMENTS.map((placement) => {
          const group = posters.filter((p) => p.placement === placement);
          const live = counts[placement] ?? 0;

          return (
            <section key={placement} className="panel overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-surface-2 px-4 py-2.5">
                <div>
                  <h2 className={cardTitle}>{PLACEMENT_LABELS[placement]}</h2>
                  <p className="mt-0.5 text-[11px] text-muted">
                    {PLACEMENT_HINTS[placement]}
                  </p>
                </div>
                <span className="shrink-0 text-[11px] text-muted">
                  {live} live
                  {placement === "hero" && live > 3 && " · only the first 3 rotate"}
                </span>
              </div>

              {group.length === 0 ? (
                <p className="px-4 py-8 text-center text-[13px] text-muted">
                  Nothing here yet.
                </p>
              ) : (
                <ul className="divide-y divide-line">
                  {group.map((poster) => {
                    const note = scheduleNote(poster);
                    return (
                      <li
                        key={poster.id}
                        className="flex flex-wrap items-center gap-3 px-4 py-3"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={poster.image_url}
                          alt=""
                          className="h-14 w-24 shrink-0 border border-line bg-surface-2 object-contain"
                        />

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-semibold">
                            {poster.title}
                          </p>
                          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-subtle">
                            <span>Order {poster.sort_order}</span>
                            <span>·</span>
                            <span>Added {formatDate(poster.created_at)}</span>
                            {poster.link_url && (
                              <>
                                <span>·</span>
                                <span className="truncate font-mono">
                                  {poster.link_url}
                                </span>
                              </>
                            )}
                          </p>
                          {note && (
                            <p className="mt-0.5 text-[11px] text-amber-700">{note}</p>
                          )}
                        </div>

                        <span
                          className={`shrink-0 rounded-sm px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                            poster.is_active
                              ? "bg-green-100 text-green-800"
                              : "bg-ink-100 text-ink-600"
                          }`}
                        >
                          {poster.is_active ? "Live" : "Hidden"}
                        </span>

                        <div className="flex shrink-0 items-center gap-1">
                          <form action={movePoster}>
                            <input type="hidden" name="id" value={poster.id} />
                            <input type="hidden" name="direction" value="up" />
                            <button
                              type="submit"
                              title="Move up"
                              className={button("ghost", "sm")}
                            >
                              <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                              <span className="sr-only">Move {poster.title} up</span>
                            </button>
                          </form>
                          <form action={movePoster}>
                            <input type="hidden" name="id" value={poster.id} />
                            <input type="hidden" name="direction" value="down" />
                            <button
                              type="submit"
                              title="Move down"
                              className={button("ghost", "sm")}
                            >
                              <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                              <span className="sr-only">Move {poster.title} down</span>
                            </button>
                          </form>

                          <form action={togglePoster}>
                            <input type="hidden" name="id" value={poster.id} />
                            <input
                              type="hidden"
                              name="next"
                              value={String(!poster.is_active)}
                            />
                            <button
                              type="submit"
                              title={poster.is_active ? "Hide" : "Show"}
                              className={button("ghost", "sm")}
                            >
                              {poster.is_active ? (
                                <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
                              ) : (
                                <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                              )}
                              <span className="sr-only">
                                {poster.is_active ? "Hide" : "Show"} {poster.title}
                              </span>
                            </button>
                          </form>

                          <Link
                            href={`/posters/${poster.id}`}
                            className={button("outline", "sm")}
                          >
                            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                            Edit
                          </Link>

                          <DeletePosterButton id={poster.id} title={poster.title} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
