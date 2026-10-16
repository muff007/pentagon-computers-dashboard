"use server";

import { revalidatePath } from "next/cache";
import { admin } from "@/lib/supabase";
import { isSignedIn } from "@/lib/session";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/types";

export type OrderFormState = { error?: string; success?: string };

/**
 * Updates fulfilment details for one order.
 *
 * Timestamps are stamped automatically the first time an order reaches
 * "shipped" or "delivered", so staff never have to type a date.
 */
export async function updateOrder(
  _prev: OrderFormState,
  formData: FormData,
): Promise<OrderFormState> {
  if (!(await isSignedIn())) return { error: "Not signed in." };

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as OrderStatus;

  if (!id) return { error: "Missing order id." };
  if (!ORDER_STATUSES.includes(status)) return { error: "Unknown status." };

  const client = admin();
  const { data: current } = await client
    .from("orders")
    .select("status, shipped_at, delivered_at")
    .eq("id", id)
    .maybeSingle();

  if (!current) return { error: "Order not found." };

  const now = new Date().toISOString();
  const values: Record<string, unknown> = {
    status,
    courier: String(formData.get("courier") ?? "").trim() || null,
    tracking_id: String(formData.get("tracking_id") ?? "").trim() || null,
    staff_note: String(formData.get("staff_note") ?? "").trim() || null,
    updated_at: now,
  };

  if (status === "shipped" && !current.shipped_at) values.shipped_at = now;
  if (status === "delivered") {
    if (!current.shipped_at) values.shipped_at = now;
    if (!current.delivered_at) values.delivered_at = now;
  }

  const { error } = await client.from("orders").update(values).eq("id", id);

  if (error) {
    // The commonest cause is the status check constraint not having been
    // widened yet, so point at the fix rather than echoing raw SQL.
    if (error.message.includes("orders_status_check")) {
      return {
        error:
          'The database does not accept that status yet. Run supabase/dashboard-migration.sql in the Supabase SQL editor, then try again.',
      };
    }
    return { error: error.message };
  }

  revalidatePath("/sales");
  revalidatePath(`/sales/${id}`);
  return { success: "Order updated." };
}
