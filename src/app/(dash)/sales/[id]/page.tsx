import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, Package, Phone } from "lucide-react";
import FulfilmentForm from "@/components/FulfilmentForm";
import OrderStatusBadge from "@/components/OrderStatusBadge";
import CopyAddress from "@/components/CopyAddress";
import { getOrder } from "@/lib/orders";
import { formatDateTime, formatINR } from "@/lib/format";
import { cardTitle, pageTitle } from "@/lib/ui";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return { title: `Order #${id.slice(0, 8).toUpperCase()}` };
}

export default async function OrderPage({ params }: Props) {
  const { id } = await params;
  const order = await getOrder(id);
  if (!order) notFound();

  const ship = order.shipping ?? null;
  const itemsTotal = (order.order_items ?? []).reduce(
    (sum, i) => sum + Number(i.unit_price) * i.quantity,
    0,
  );
  const delivery = Number(order.amount) - itemsTotal;

  return (
    <div>
      <Link
        href="/sales"
        className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-ink-900"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        Back to sales
      </Link>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className={`${pageTitle} font-mono`}>
            #{order.id.slice(0, 8).toUpperCase()}
          </h1>
          <p className="mt-0.5 text-[13px] text-muted">
            Placed {formatDateTime(order.created_at)}
          </p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          {/* Delivery address — what the parcel gets packed against */}
          <section className="panel overflow-hidden">
            <div className="flex items-center gap-2 border-b border-line bg-surface-2 px-4 py-2">
              <MapPin className="h-4 w-4 text-brand-700" aria-hidden="true" />
              <h2 className={cardTitle}>Deliver to</h2>
              {ship && (
                <div className="ml-auto">
                  <CopyAddress
                    text={[
                      ship.fullName,
                      ship.address,
                      `${ship.city}, ${ship.state} ${ship.pincode}`,
                      `Phone: ${ship.phone}`,
                    ]
                      .filter(Boolean)
                      .join("\n")}
                  />
                </div>
              )}
            </div>
            {ship ? (
              <div className="grid gap-4 p-4 sm:grid-cols-2">
                <div className="text-[13px] leading-relaxed">
                  <p className="font-semibold">{ship.fullName}</p>
                  <p className="mt-1 text-muted">
                    {ship.address}
                    <br />
                    {ship.city}, {ship.state}
                    <br />
                    PIN {ship.pincode}
                  </p>
                </div>
                <div className="text-[13px]">
                  <p className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 shrink-0 text-subtle" aria-hidden="true" />
                    <a href={`tel:${ship.phone}`} className="font-medium hover:text-brand-700">
                      {ship.phone}
                    </a>
                  </p>
                  <p className="mt-2 break-all text-muted">
                    <a href={`mailto:${ship.email}`} className="hover:text-brand-700">
                      {ship.email}
                    </a>
                  </p>
                </div>
              </div>
            ) : (
              <p className="p-4 text-[13px] text-muted">No address recorded.</p>
            )}
          </section>

          {/* Items */}
          <section className="panel overflow-hidden">
            <div className="flex items-center gap-2 border-b border-line bg-surface-2 px-4 py-2.5">
              <Package className="h-4 w-4 text-brand-700" aria-hidden="true" />
              <h2 className={cardTitle}>Items to pack</h2>
            </div>
            <ul className="divide-y divide-[var(--border)]">
              {(order.order_items ?? []).map((item) => (
                <li key={item.id} className="flex items-center gap-3 px-4 py-3">
                  {item.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.image_url}
                      alt=""
                      className="h-12 w-12 shrink-0 rounded-card border border-line object-contain"
                    />
                  ) : (
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-card border border-dashed border-line-strong text-[9px] text-subtle">
                      none
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium">{item.name}</p>
                    <p className="text-[11px] text-subtle">
                      {formatINR(item.unit_price)} each
                    </p>
                  </div>
                  <span className="shrink-0 rounded-sm bg-ink-100 px-2 py-1 text-[11px] font-bold">
                    &times;{item.quantity}
                  </span>
                  <span className="w-24 shrink-0 text-right text-[13px] font-semibold tabular-nums">
                    {formatINR(Number(item.unit_price) * item.quantity)}
                  </span>
                </li>
              ))}
            </ul>
            <dl className="space-y-1 border-t border-line bg-surface-2 px-4 py-3 text-[13px]">
              <div className="flex justify-between">
                <dt className="text-muted">Items</dt>
                <dd className="tabular-nums">{formatINR(itemsTotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Delivery</dt>
                <dd className="tabular-nums">
                  {delivery > 0 ? formatINR(delivery) : "Free"}
                </dd>
              </div>
              <div className="flex justify-between border-t border-line pt-1 font-bold">
                <dt>Total paid</dt>
                <dd className="tabular-nums">{formatINR(order.amount)}</dd>
              </div>
            </dl>
          </section>

          {/* Payment */}
          <section className="panel overflow-hidden">
            <div className="border-b border-line bg-surface-2 px-4 py-2.5">
              <h2 className={cardTitle}>Payment</h2>
            </div>
            <dl className="grid gap-3 p-4 text-[13px] sm:grid-cols-2">
              <div>
                <dt className="text-[11px] uppercase tracking-wider text-subtle">
                  Razorpay order
                </dt>
                <dd className="mt-0.5 break-all font-mono">
                  {order.razorpay_order_id ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wider text-subtle">
                  Razorpay payment
                </dt>
                <dd className="mt-0.5 break-all font-mono">
                  {order.razorpay_payment_id ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wider text-subtle">
                  Shipped
                </dt>
                <dd className="mt-0.5">{formatDateTime(order.shipped_at)}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wider text-subtle">
                  Delivered
                </dt>
                <dd className="mt-0.5">{formatDateTime(order.delivered_at)}</dd>
              </div>
            </dl>
          </section>
        </div>

        {/* Fulfilment */}
        <aside className="panel h-fit overflow-hidden">
          <div className="border-b border-line bg-surface-2 px-4 py-2.5">
            <h2 className={cardTitle}>Fulfilment</h2>
          </div>
          <FulfilmentForm order={order} />
        </aside>
      </div>
    </div>
  );
}
