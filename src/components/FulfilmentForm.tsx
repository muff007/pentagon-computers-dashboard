"use client";

import { useActionState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { updateOrder, type OrderFormState } from "@/lib/actions/orders";
import { button, field, label } from "@/lib/ui";
import { ORDER_STATUSES, type Order } from "@/lib/types";

const LABELS: Record<string, string> = {
  created: "Awaiting payment",
  paid: "Paid — ready to pack",
  packed: "Packed",
  shipped: "Shipped",
  delivered: "Delivered",
  failed: "Payment failed",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

export default function FulfilmentForm({ order }: { order: Order }) {
  const [state, formAction, pending] = useActionState<OrderFormState, FormData>(
    updateOrder,
    {},
  );

  return (
    <form action={formAction} className="space-y-4 p-4">
      <input type="hidden" name="id" value={order.id} />

      {state.error && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-card border border-red-200 bg-red-50 px-3 py-2.5 text-[13px] text-red-800"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {state.error}
        </p>
      )}
      {state.success && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-card border border-green-200 bg-green-50 px-3 py-2.5 text-[13px] text-green-800"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          {state.success}
        </p>
      )}

      <div>
        <label htmlFor="status" className={label}>
          Status
        </label>
        <select
          id="status"
          name="status"
          defaultValue={order.status}
          className={`${field} mt-1.5`}
        >
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {LABELS[s] ?? s}
            </option>
          ))}
        </select>
        <p className="mt-1 text-[11px] text-muted">
          Shipped and delivered stamp their own date the first time they are set.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="courier" className={label}>
            Courier
          </label>
          <input
            id="courier"
            name="courier"
            defaultValue={order.courier ?? ""}
            placeholder="Professional, DTDC, Delhivery…"
            className={`${field} mt-1.5`}
          />
        </div>
        <div>
          <label htmlFor="tracking_id" className={label}>
            Tracking number
          </label>
          <input
            id="tracking_id"
            name="tracking_id"
            defaultValue={order.tracking_id ?? ""}
            className={`${field} mt-1.5 font-mono`}
          />
        </div>
      </div>

      <div>
        <label htmlFor="staff_note" className={label}>
          Internal note
        </label>
        <textarea
          id="staff_note"
          name="staff_note"
          rows={3}
          defaultValue={order.staff_note ?? ""}
          placeholder="Only staff see this — the customer never does."
          className={`${field} mt-1.5 resize-y`}
        />
      </div>

      <button type="submit" disabled={pending} className={button("primary", "md")}>
        {pending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
