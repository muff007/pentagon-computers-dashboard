import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "No connection",
  robots: { index: false, follow: false },
};

/**
 * Shown by the service worker when a page request fails outright. It must not
 * read anything from the database — by definition there is no network when
 * this renders.
 */
export default function OfflinePage() {
  return (
    <div className="grid min-h-dvh place-items-center bg-ink-900 px-6">
      <div className="w-full max-w-sm text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/icon-192.png"
          alt=""
          aria-hidden="true"
          className="mx-auto h-16 w-16 rounded-card"
        />
        <h1 className="mt-5 text-xl font-extrabold tracking-tight text-white">
          No connection
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-300">
          The dashboard needs a network connection — it reads live stock and
          orders, so there is nothing useful to show from memory.
        </p>
        <p className="mt-4 text-sm text-ink-300">
          Check your signal or Wi-Fi, then try again.
        </p>
      </div>
    </div>
  );
}
