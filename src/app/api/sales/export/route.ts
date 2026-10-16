import { listOrders } from "@/lib/orders";
import { isSignedIn } from "@/lib/session";

export const runtime = "nodejs";

/** Escapes a value for CSV: quote it, and double any quotes inside. */
function cell(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

const HEADERS = [
  "Order ID",
  "Placed",
  "Status",
  "Customer",
  "Phone",
  "Email",
  "Address",
  "City",
  "State",
  "PIN",
  "Items",
  "Total (INR)",
  "Courier",
  "Tracking",
  "Shipped",
  "Delivered",
  "Razorpay payment",
];

/**
 * Exports the current filtered view as CSV, for couriers and for the
 * accountant. Reads the same filters as the sales page so what you see is what
 * you download.
 */
export async function GET(request: Request) {
  if (!(await isSignedIn())) {
    return new Response("Not signed in.", { status: 401 });
  }

  const params = new URL(request.url).searchParams;
  const { orders } = await listOrders({
    q: params.get("q") ?? undefined,
    status: params.get("status") ?? undefined,
    from: params.get("from") ?? undefined,
    to: params.get("to") ?? undefined,
    perPage: 5000,
  });

  const rows = orders.map((order) => {
    const ship = order.shipping ?? null;
    const items = (order.order_items ?? [])
      .map((i) => `${i.quantity} x ${i.name}`)
      .join("; ");

    return [
      order.id,
      new Date(order.created_at).toISOString(),
      order.status,
      ship?.fullName,
      ship?.phone,
      ship?.email,
      ship?.address,
      ship?.city,
      ship?.state,
      ship?.pincode,
      items,
      Number(order.amount).toFixed(2),
      order.courier,
      order.tracking_id,
      order.shipped_at,
      order.delivered_at,
      order.razorpay_payment_id,
    ].map(cell).join(",");
  });

  // BOM so Excel opens the rupee amounts and Tamil place names as UTF-8.
  const csv = `﻿${HEADERS.map(cell).join(",")}\n${rows.join("\n")}\n`;
  const stamp = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="pentagon-sales-${stamp}.csv"`,
    },
  });
}
