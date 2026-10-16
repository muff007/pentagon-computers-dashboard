import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import RegisterServiceWorker from "@/components/RegisterServiceWorker";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "Pentagon Computers — Dashboard",
    template: "%s · Pentagon Dashboard",
  },
  description: "Internal admin dashboard for the Pentagon Computers storefront.",
  robots: { index: false, follow: false },
  // Installed on a phone, this opens without browser chrome.
  appleWebApp: { capable: true, title: "Dashboard", statusBarStyle: "black-translucent" },
};

/**
 * Without this there is no <meta name="viewport">, and a phone then lays the
 * page out at about 980px and scales it down to fit — so the whole dashboard
 * arrives zoomed out, worst on /products where the table is widest.
 *
 * Zoom is deliberately left enabled. Pinning maximumScale would stop someone
 * magnifying a serial number in the shop, which is exactly when this gets
 * opened on a phone.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#111418",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full`}>
      <body className="min-h-full">
        {children}
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
