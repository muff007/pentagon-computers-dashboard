"use client";

import { useEffect } from "react";

/**
 * Registers /sw.js so the dashboard can be installed to a phone's home screen.
 *
 * Production only: in development a cached shell would get in the way of a
 * recompile.
 */
export default function RegisterServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      // A failed registration must never take the page down with it.
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    };

    if (document.readyState === "complete") {
      register();
      return;
    }
    window.addEventListener("load", register);
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
