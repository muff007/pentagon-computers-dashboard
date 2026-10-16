import { redirect } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { isSignedIn } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * The authoritative auth check for every dashboard page.
 *
 * The proxy only looks for a cookie; this verifies its signature and expiry, so
 * a forged or stale cookie gets bounced here.
 */
export default async function DashLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await isSignedIn())) redirect("/login");

  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <div className="min-w-0 flex-1">
        {/* pt-20 clears the fixed mobile bar (h-14) and leaves it breathing
            room; the desktop rail is in the flow, so lg: goes back to py-6. */}
        <main className="mx-auto max-w-7xl px-4 pt-20 pb-6 sm:px-6 lg:px-8 lg:pt-6">
          {children}
        </main>
      </div>
    </div>
  );
}
