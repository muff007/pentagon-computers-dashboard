import "server-only";

import { admin } from "@/lib/supabase";
import type { Order, OrderStatus } from "@/lib/types";

const ITEMS = "order_items(id, name, slug, image_url, unit_price, quantity)";
const BASE =
  "id, user_id, amount, currency, status, razorpay_order_id, razorpay_payment_id, shipping, created_at";

/** With the columns that supabase/dashboard-migration.sql adds. */
const SELECT = `${BASE}, courier, tracking_id, staff_note, shipped_at, delivered_at, ${ITEMS}`;
/** Without them, so the page still works before the migration is run. */
const SELECT_BASE = `${BASE}, ${ITEMS}`;

/** Postgres "undefined column" — the migration has not been applied yet. */
function isMissingColumn(error: { code?: string; message?: string } | null): boolean {
  return error?.code === "42703" || Boolean(error?.message?.includes("does not exist"));
}

/**
 * True once the fulfilment columns exist. The sales pages use this to show a
 * one-time "run the migration" notice instead of failing outright.
 */
export async function fulfilmentReady(): Promise<boolean> {
  const { error } = await admin().from("orders").select("courier").limit(1);
  return !isMissingColumn(error);
}

/** Statuses that represent money actually received. */
export const EARNING_STATUSES: OrderStatus[] = [
  "paid",
  "packed",
  "shipped",
  "delivered",
];

/** Paid but not yet handed to a courier — the queue staff work through. */
export const AWAITING_DISPATCH: OrderStatus[] = ["paid", "packed"];

export type OrderFilters = {
  q?: string;
  status?: string;
  from?: string;
  to?: string;
  page?: number;
  perPage?: number;
};

export async function listOrders(filters: OrderFilters = {}) {
  const perPage = filters.perPage ?? 25;
  const page = Math.max(1, filters.page ?? 1);

  const build = (select: string) => {
    let q = admin().from("orders").select(select, { count: "exact" });
    if (filters.status === "awaiting") q = q.in("status", AWAITING_DISPATCH);
    else if (filters.status) q = q.eq("status", filters.status);
    if (filters.from) q = q.gte("created_at", `${filters.from}T00:00:00Z`);
    if (filters.to) q = q.lte("created_at", `${filters.to}T23:59:59Z`);
    if (filters.q) {
      const term = filters.q.replace(/[,()%\\]/g, " ").trim();
      if (term) {
        q = q.or(
          `shipping->>fullName.ilike.%${term}%,shipping->>email.ilike.%${term}%,shipping->>phone.ilike.%${term}%,shipping->>city.ilike.%${term}%`,
        );
      }
    }
    const start = (page - 1) * perPage;
    return q.order("created_at", { ascending: false }).range(start, start + perPage - 1);
  };

  let { data, count, error } = await build(SELECT);

  // Before the migration those columns are absent; fall back so the page still
  // renders instead of returning a 500.
  if (isMissingColumn(error)) {
    ({ data, count, error } = await build(SELECT_BASE));
  }

  if (error) throw new Error(error.message);

  const totalCount = count ?? 0;
  return {
    orders: (data as unknown as Order[]) ?? [],
    total: totalCount,
    page,
    perPage,
    pageCount: Math.ceil(totalCount / perPage),
  };
}

export async function getOrder(id: string): Promise<Order | null> {
  let { data, error } = await admin()
    .from("orders")
    .select(SELECT)
    .eq("id", id)
    .maybeSingle();

  if (isMissingColumn(error)) {
    ({ data, error } = await admin()
      .from("orders")
      .select(SELECT_BASE)
      .eq("id", id)
      .maybeSingle());
  }

  return (data as unknown as Order) ?? null;
}

export type SalesStats = {
  revenue: number;
  paidOrders: number;
  awaitingDispatch: number;
  delivered: number;
  unpaid: number;
  last30Revenue: number;
};

export async function getSalesStats(): Promise<SalesStats> {
  const client = admin();
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [earning, recent, awaiting, delivered, unpaid] = await Promise.all([
    client.from("orders").select("amount").in("status", EARNING_STATUSES),
    client
      .from("orders")
      .select("amount")
      .in("status", EARNING_STATUSES)
      .gte("created_at", since),
    client
      .from("orders")
      .select("id", { count: "exact", head: true })
      .in("status", AWAITING_DISPATCH),
    client
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("status", "delivered"),
    client
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("status", "created"),
  ]);

  const sum = (rows: { amount: number }[] | null) =>
    (rows ?? []).reduce((total, row) => total + Number(row.amount), 0);

  return {
    revenue: sum(earning.data),
    paidOrders: (earning.data ?? []).length,
    last30Revenue: sum(recent.data),
    awaitingDispatch: awaiting.count ?? 0,
    delivered: delivered.count ?? 0,
    unpaid: unpaid.count ?? 0,
  };
}

/** Units sold per product, highest first. */
export async function getTopProducts(limit = 8) {
  const { data } = await admin()
    .from("order_items")
    .select("name, slug, quantity, unit_price, order:orders!inner(status)")
    .in("order.status", EARNING_STATUSES);

  const rows = (data ?? []) as unknown as {
    name: string;
    slug: string | null;
    quantity: number;
    unit_price: number;
  }[];

  const totals = new Map<string, { name: string; units: number; revenue: number }>();
  for (const row of rows) {
    const key = row.slug ?? row.name;
    const current = totals.get(key) ?? { name: row.name, units: 0, revenue: 0 };
    current.units += row.quantity;
    current.revenue += row.quantity * Number(row.unit_price);
    totals.set(key, current);
  }

  return [...totals.values()].sort((a, b) => b.units - a.units).slice(0, limit);
}
