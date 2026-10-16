import type { Metadata } from "next";
import { redirect } from "next/navigation";
import LoginForm from "@/components/LoginForm";
import { isSignedIn } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  if (await isSignedIn()) redirect("/products");

  return (
    <div className="flex min-h-dvh items-center justify-center bg-ink-900 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.jpg"
            alt="Pentagon Computers"
            className="mx-auto mb-3 h-16 w-16 rounded-card bg-white object-contain p-1"
          />
          <p className="text-lg font-extrabold tracking-tight text-white">
            PENTAGON COMPUTERS
          </p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-brand-500">
            Admin dashboard
          </p>
        </div>

        <div className="panel p-6">
          <h1 className="text-base font-bold">Sign in</h1>
          <p className="mt-1 text-xs text-muted">
            This dashboard is for store staff only.
          </p>
          <div className="mt-5">
            <LoginForm />
          </div>
        </div>

        <p className="mt-5 text-center text-[11px] text-ink-400">
          Pentagon Computers · Madurai &amp; Sivakasi
        </p>
      </div>
    </div>
  );
}
