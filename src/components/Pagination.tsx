import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Pagination({
  page,
  pageCount,
  searchParams,
  basePath,
}: {
  page: number;
  pageCount: number;
  searchParams: Record<string, string | string[] | undefined>;
  basePath: string;
}) {
  if (pageCount <= 1) return null;

  const href = (target: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      if (key === "page" || value === undefined) continue;
      for (const v of Array.isArray(value) ? value : [value]) {
        if (v) params.append(key, v);
      }
    }
    if (target > 1) params.set("page", String(target));
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  const base =
    "grid h-8 min-w-8 place-items-center rounded-card border px-2.5 text-xs font-medium transition-colors";
  const idle = `${base} border-line bg-white text-ink-700 hover:border-ink-900`;
  const off = `${base} border-line text-subtle opacity-45`;

  return (
    <nav aria-label="Pagination" className="flex items-center gap-1.5">
      {page > 1 ? (
        <Link href={href(page - 1)} className={idle} rel="prev" aria-label="Previous page">
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      ) : (
        <span className={off} aria-hidden="true">
          <ChevronLeft className="h-3.5 w-3.5" />
        </span>
      )}

      <span className="px-2 text-xs text-muted">
        Page {page} of {pageCount}
      </span>

      {page < pageCount ? (
        <Link href={href(page + 1)} className={idle} rel="next" aria-label="Next page">
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      ) : (
        <span className={off} aria-hidden="true">
          <ChevronRight className="h-3.5 w-3.5" />
        </span>
      )}
    </nav>
  );
}
