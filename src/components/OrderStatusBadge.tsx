import type { OrderStatus } from "@/lib/types";

const STYLES: Record<OrderStatus, { label: string; className: string }> = {
  created: { label: "Awaiting payment", className: "bg-ink-100 text-ink-600" },
  paid: { label: "Paid", className: "bg-green-100 text-green-800" },
  packed: { label: "Packed", className: "bg-brand-100 text-brand-800" },
  shipped: { label: "Shipped", className: "bg-amber-100 text-amber-800" },
  delivered: { label: "Delivered", className: "bg-green-600 text-white" },
  failed: { label: "Payment failed", className: "bg-red-100 text-red-800" },
  cancelled: { label: "Cancelled", className: "bg-ink-100 text-ink-500" },
  refunded: { label: "Refunded", className: "bg-red-50 text-red-700" },
};

export default function OrderStatusBadge({ status }: { status: OrderStatus }) {
  // Falls back gracefully if the database ever holds a status we do not know.
  const style = STYLES[status] ?? {
    label: status,
    className: "bg-ink-100 text-ink-600",
  };

  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-sm px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${style.className}`}
    >
      {style.label}
    </span>
  );
}
