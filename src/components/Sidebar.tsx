"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  FileSpreadsheet,
  Images,
  LogOut,
  Menu,
  PackagePlus,
  ReceiptText,
  Table2,
  X,
} from "lucide-react";
import { signOut } from "@/lib/actions/auth";

const LINKS = [
  { href: "/products", label: "Products", icon: Table2, exact: true },
  { href: "/products/new", label: "Add product", icon: PackagePlus },
  { href: "/products/bulk", label: "Bulk upload", icon: FileSpreadsheet },
  { href: "/posters", label: "Posters", icon: Images },
  { href: "/sales", label: "Sales tracker", icon: ReceiptText },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close the drawer when the route changes, adjusted during render so the
  // panel never lingers over the new page for a frame.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  const nav = (
    <nav className="flex-1 space-y-0.5 p-3" aria-label="Dashboard">
      {LINKS.map(({ href, label, icon: Icon, exact }) => {
        const active = isActive(href, exact);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-2.5 rounded-card px-3 py-2 text-[13px] font-medium transition-colors ${
              active
                ? "bg-brand-700 text-white"
                : "text-ink-300 hover:bg-ink-800 hover:text-white"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            {label}
          </Link>
        );
      })}
    </nav>
  );

  // The logo is a JPEG on white, so it sits on a white plate over the dark rail.
  const brand = (
    <div className="flex items-center gap-2.5 px-4 py-3.5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo.jpg"
        alt=""
        aria-hidden="true"
        className="h-9 w-9 shrink-0 rounded-card bg-white object-contain p-0.5"
      />
      <span className="min-w-0">
        <span className="block text-sm font-extrabold tracking-tight text-white">
          PENTAGON
        </span>
        <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-brand-500">
          Dashboard
        </span>
      </span>
    </div>
  );

  const footer = (
    <form action={signOut} className="border-t border-ink-800 p-3">
      <button
        type="submit"
        className="flex w-full items-center gap-2.5 rounded-card px-3 py-2 text-[13px] font-medium text-ink-300 transition-colors hover:bg-ink-800 hover:text-white"
      >
        <LogOut className="h-4 w-4" aria-hidden="true" />
        Sign out
      </button>
    </form>
  );

  return (
    <>
      {/* Mobile bar */}
      <div className="fixed inset-x-0 top-0 z-30 flex h-14 items-center gap-3 border-b border-ink-800 bg-ink-900 px-4 lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="grid h-9 w-9 place-items-center rounded-card text-ink-300 hover:bg-ink-800 hover:text-white"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>
        <p className="text-sm font-extrabold tracking-tight text-white">
          PENTAGON <span className="text-brand-500">DASHBOARD</span>
        </p>
      </div>
      {/* No spacer here: this component renders into a row flex container, so a
          spacer div would take width instead of height. The layout pads the
          content column down past this bar instead. */}

      {/* Desktop rail */}
      <aside className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col bg-ink-900 lg:flex">
        <div className="border-b border-ink-800">{brand}</div>
        {nav}
        {footer}
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="animate-fade absolute inset-0 bg-ink-900/60"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-y-0 left-0 flex w-64 flex-col bg-ink-900">
            <div className="flex items-center justify-between border-b border-ink-800 pr-2">
              <div className="flex-1">{brand}</div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-card text-ink-300 hover:bg-ink-800 hover:text-white"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            {nav}
            {footer}
          </div>
        </div>
      )}
    </>
  );
}
