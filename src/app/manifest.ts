import type { MetadataRoute } from "next";

/**
 * Makes the dashboard installable on a phone, so a manager gets a home-screen
 * icon that opens straight into the panel with no browser chrome.
 *
 * It deliberately starts at /products rather than / — the one place worth
 * landing on when you have pulled the phone out to check something.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/products",
    name: "Pentagon Dashboard",
    short_name: "Dashboard",
    description:
      "Pentagon Computers admin: products, bulk upload, posters and the sales tracker.",
    start_url: "/products",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    // Matches the dark rail, so the splash and status bar do not flash white.
    background_color: "#111418",
    theme_color: "#111418",
    lang: "en-IN",
    dir: "ltr",
    categories: ["business", "productivity"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      { name: "Sales tracker", short_name: "Sales", url: "/sales" },
      { name: "Bulk upload", short_name: "Bulk", url: "/products/bulk" },
      { name: "Add product", short_name: "Add", url: "/products/new" },
    ],
  };
}
