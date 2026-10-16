"use client";

import { useEffect } from "react";
import { RefreshCw, WifiOff } from "lucide-react";
import { button } from "@/lib/ui";

/**
 * Every dashboard page reads from Supabase while rendering, so a dropped
 * connection throws and would otherwise show Next's bare error screen. Staff
 * get told what happened and how to retry instead.
 */
export default function DashError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="panel mx-auto mt-10 max-w-md p-6 text-center">
      <span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-amber-100 text-amber-700">
        <WifiOff className="h-5 w-5" aria-hidden="true" />
      </span>

      <h1 className="mt-3 text-base font-bold">Could not load this page</h1>
      <p className="mt-1.5 text-[13px] text-muted">
        The dashboard could not reach the database. This is almost always the
        internet connection — check it and try again.
      </p>

      <button type="button" onClick={reset} className={`${button("primary", "md")} mt-5`}>
        <RefreshCw className="h-4 w-4" aria-hidden="true" />
        Try again
      </button>

      {error.digest && (
        <p className="mt-4 font-mono text-[11px] text-subtle">
          Reference: {error.digest}
        </p>
      )}
    </div>
  );
}
