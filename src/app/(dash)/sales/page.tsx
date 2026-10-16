import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, Download, Search, Truck } from "lucide-react";
import OrderStatusBadge from "@/components/OrderStatusBadge";
import Pagination from "@/components/Pagination";
import { fulfilmentReady, getSalesStats, getTopProducts, listOrders } from "@/lib/orders";
import { formatDate, formatINR } from "@/lib/format";
import { button, cardTitle, field, fieldInline, pageTitle } from "@/lib/ui";
import { ORDER_STATUSES } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Sales tracker" };

type SearchParams = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="panel p-4">
      <p className="text-[11px] uppercase tracking-wider text-subtle">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-muted">{hint}</p>}
    </div>
  );
}

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const q = one(params.q)?.trim() || undefined;
  const status = one(params.status) || undefined;
  const from = one(params.from) || undefined;
  const to = one(params.to) || undefined;
  const page = Math.max(1, Number(one(params.page) ?? 1) || 1);

  const [{ orders, total, pageCount, perPage }, stats, top, ready] = await Promise.all([
    listOrders({ q, status, from, to, page }),
    getSalesStats(),
    getTopProducts(6),
    fulfilmentReady(),
  ]);

  const shown = total === 0 ? 0 : (page - 1) * perPage + 1;
  const upto = Math.min(page * perPage, total);

  const exportQuery = new URLSearchParams();
  for (const [key, value] of Object.entries({ q, status, from, to })) {
    if (value) exportQuery.set(key, value);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className={pageTitle}>Sales tracker</h1>
          <p className="mt-0.5 text-[13px] text-muted">
            Orders, delivery addresses and fulfilment status.
          </p>
        </div>
        <a
          href={`/api/sales/export?${exportQuery}`}
          className={button("outline", "md")}
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          Export CSV
        </a>
      </div>

      {!ready && (
        <p className="mt-4 flex items-start gap-2.5 rounded-card border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            <strong>One setup step left.</strong> Run{" "}
            <code className="rounded bg-amber-100 px-1 font-mono text-[11px]">
              supabase/dashboard-migration.sql
            </code>{" "}
            in the Supabase SQL editor to enable courier, tracking and the
            packed/shipped/delivered statuses. Orders still list without it.
          </span>
        </p>
      )}

      {/* Headline numbers */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Revenue"
          value={formatINR(stats.revenue)}
          hint={`${formatINR(stats.last30Revenue)} in the last 30 days`}
        />
        <StatCard
          label="Paid orders"
          value={String(stats.paidOrders)}
          hint={`${stats.unpaid} awaiting payment`}
        />
        <StatCard
          label="To dispatch"
          value={String(stats.awaitingDispatch)}
          hint="Paid but not yet shipped"
        />
        <StatCard
          label="Delivered"
          value={String(stats.delivered)}
          hint="Signed for by the customer"
        />
      </div>

      {stats.awaitingDispatch > 0 && (
        <Link
          href="/sales?status=awaiting"
          className="mt-3 flex items-center gap-2.5 rounded-card border border-amber-200 bg-amber-50 px-4 py-2.5 text-[13px] text-amber-900 hover:border-amber-300"
        >
          <Truck className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            <strong>
              {stats.awaitingDispatch} order
              {stats.awaitingDispatch === 1 ? "" : "s"}
            </strong>{" "}
            paid for and waiting to be dispatched — open the queue
          </span>
        </Link>
      )}

      {/* Filters */}
      <form className="panel mt-4 flex flex-wrap items-end gap-3 p-3" method="get">
        <div className="min-w-52 flex-1">
          <label htmlFor="q" className="sr-only">
            Search orders
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle"
              aria-hidden="true"
            />
            <input
              id="q"
              name="q"
              defaultValue={q ?? ""}
              placeholder="Customer name, email, phone or city"
              className={`${field} pl-9`}
            />
          </div>
        </div>

        <select name="status" defaultValue={status ?? ""} aria-label="Status" className={fieldInline}>
          <option value="">Any status</option>
          <option value="awaiting">Awaiting dispatch</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s[0].toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>

        <div>
          <label htmlFor="from" className="block text-[11px] text-subtle">
            From
          </label>
          <input id="from" name="from" type="date" defaultValue={from ?? ""} className={fieldInline} />
        </div>
        <div>
          <label htmlFor="to" className="block text-[11px] text-subtle">
            To
          </label>
          <input id="to" name="to" type="date" defaultValue={to ?? ""} className={fieldInline} />
        </div>

        <button type="submit" className={button("dark", "md")}>
          Apply
        </button>
        <Link href="/sales" className={button("ghost", "md")}>
          Reset
        </Link>
      </form>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_300px]">
        {/* Orders */}
        <div className="panel overflow-hidden">
          {orders.length === 0 ? (
            <p className="px-4 py-16 text-center text-[13px] text-muted">
              No orders match those filters.
            </p>
          ) : (
            <div className="table-scroll">
              <table className="w-full min-w-[760px] border-collapse text-[13px]">
                <thead>
                  <tr className="table-head border-b border-line text-left text-[11px] uppercase tracking-wider text-subtle">
                    <th className="px-3 py-2.5 font-semibold">Order</th>
                    <th className="px-3 py-2.5 font-semibold">Customer</th>
                    <th className="px-3 py-2.5 font-semibold">Deliver to</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Total</th>
                    <th className="px-3 py-2.5 font-semibold">Status</th>
                    <th className="px-3 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id} className="border-b border-line last:border-0 hover:bg-surface-2">
                      <td className="px-3 py-2.5">
                        <p className="font-mono font-semibold">
                          #{order.id.slice(0, 8).toUpperCase()}
                        </p>
                        <p className="text-[11px] text-subtle">
                          {formatDate(order.created_at)} ·{" "}
                          {order.order_items?.length ?? 0} item
                          {(order.order_items?.length ?? 0) === 1 ? "" : "s"}
                        </p>
                      </td>
                      <td className="px-3 py-2.5">
                        <p className="font-medium">{order.shipping?.fullName ?? "—"}</p>
                        <p className="text-[11px] text-subtle">{order.shipping?.phone}</p>
                      </td>
                      <td className="px-3 py-2.5 text-muted">
                        {order.shipping?.city ?? "—"}
                        <span className="block text-[11px] text-subtle">
                          {order.shipping?.pincode}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right font-semibold tabular-nums">
                        {formatINR(order.amount)}
                      </td>
                      <td className="px-3 py-2.5">
                        <OrderStatusBadge status={order.status} />
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <Link href={`/sales/${order.id}`} className={button("outline", "sm")}>
                          Open
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Best sellers */}
        <aside className="panel h-fit overflow-hidden">
          <div className="border-b border-line bg-surface-2 px-4 py-2.5">
            <h2 className={cardTitle}>Best selling</h2>
          </div>
          {top.length === 0 ? (
            <p className="px-4 py-8 text-center text-[13px] text-muted">
              No paid orders yet.
            </p>
          ) : (
            <ol className="divide-y divide-[var(--border)]">
              {top.map((item, i) => (
                <li key={item.name} className="flex items-start gap-2.5 px-4 py-2.5">
                  <span className="mt-0.5 w-4 shrink-0 text-[11px] font-bold text-subtle">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium">
                      {item.name}
                    </span>
                    <span className="text-[11px] text-muted">
                      {item.units} sold · {formatINR(item.revenue)}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </aside>
      </div>

      {total > 0 && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[13px] text-muted">
            Showing {shown}–{upto} of {total}
          </p>
          <Pagination page={page} pageCount={pageCount} searchParams={params} basePath="/sales" />
        </div>
      )}
    </div>
  );
}
