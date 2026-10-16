export type Brand = { id: string; slug: string; name: string };
export type Category = { id: string; slug: string; name: string };

export type Product = {
  id: string;
  slug: string;
  name: string;
  brand_id: string | null;
  category_id: string | null;
  price: number;
  mrp: number | null;
  stock: number;
  short_desc: string | null;
  description: string | null;
  image_url: string | null;
  /** Extra photos shown on the product page. The cover is image_url. */
  gallery?: string[] | null;
  specs: Record<string, string>;
  rating: number | null;
  rating_count: number;
  is_featured: boolean;
  is_active: boolean;
  created_at: string;
  brand?: Pick<Brand, "id" | "slug" | "name"> | null;
  category?: Pick<Category, "id" | "slug" | "name"> | null;
};

export const ORDER_STATUSES = [
  "created",
  "paid",
  "packed",
  "shipped",
  "delivered",
  "failed",
  "cancelled",
  "refunded",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type ShippingAddress = {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
};

export type OrderItem = {
  id: string;
  name: string;
  slug: string | null;
  image_url: string | null;
  unit_price: number;
  quantity: number;
};

export type Order = {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  status: OrderStatus;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  shipping: ShippingAddress;
  courier: string | null;
  tracking_id: string | null;
  staff_note: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  created_at: string;
  order_items?: OrderItem[];
};

/** Where a poster appears on the storefront. */
export const POSTER_PLACEMENTS = ["hero", "home", "offers", "deals"] as const;

export type PosterPlacement = (typeof POSTER_PLACEMENTS)[number];

export const PLACEMENT_LABELS: Record<PosterPlacement, string> = {
  hero: "Home hero slider",
  home: "Home page blocks",
  offers: "Offers page",
  deals: "Best deals page",
};

export const PLACEMENT_HINTS: Record<PosterPlacement, string> = {
  hero: "The rotating banner at the top of the home page. Wide artwork works best — around 1600×600.",
  home: "Dotted between the home page sections. Any shape; wide ones span the full width.",
  offers: "The Offers page wall. Add as many as you like.",
  deals: "Shown on the Best deals page above the discounted products.",
};

export type Poster = {
  id: string;
  title: string;
  image_url: string;
  link_url: string | null;
  placement: PosterPlacement;
  sort_order: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  /** How it is framed on the website. Empty until set visually. */
  layout?: Partial<PosterLayout> | null;
  created_at: string;
};

/**
 * Exactly how a poster sits on the website.
 *
 * A frame of a chosen shape, with the artwork floating behind it at whatever
 * size and position the shop dragged it to. That separation is what gives full
 * control: the frame decides the space on the page, the transform decides what
 * fills it — including leaving deliberate empty space around a small logo.
 *
 * Everything is relative to the frame, never to pixels, so the same
 * arrangement holds on a phone and on a wide monitor.
 */
export type PosterLayout = {
  /** Frame shape, width / height. */
  ratio: number;
  /** Image width as a multiple of the frame width. 1 = exactly as wide. */
  scale: number;
  /** Image position: percentage of the frame, from its top-left. */
  x: number;
  y: number;
  /** Shows wherever the artwork does not reach. */
  bg: string;
};

/** Sensible starting shape for each place a poster can appear. */
export const DEFAULT_RATIO: Record<PosterPlacement, number> = {
  hero: 1600 / 600,
  home: 3,
  offers: 1.5,
  deals: 1600 / 450,
};

export const DEFAULT_LAYOUT: PosterLayout = {
  ratio: 3,
  scale: 1,
  x: 0,
  y: 0,
  bg: "#ffffff",
};

export function posterLayout(
  stored?: Partial<PosterLayout> | null,
): PosterLayout | null {
  if (!stored || typeof stored.scale !== "number" || stored.scale <= 0) return null;
  return {
    ratio:
      typeof stored.ratio === "number" && stored.ratio > 0 ? stored.ratio : 3,
    scale: stored.scale,
    x: typeof stored.x === "number" ? stored.x : 0,
    y: typeof stored.y === "number" ? stored.y : 0,
    bg: typeof stored.bg === "string" ? stored.bg : "#ffffff",
  };
}

/**
 * The scale and offset that make the artwork exactly cover the frame, or sit
 * entirely inside it. Needs the image's own proportions.
 */
export function fitLayout(
  mode: "cover" | "contain",
  ratio: number,
  imageAspect: number,
): Pick<PosterLayout, "scale" | "x" | "y"> {
  const needed = imageAspect / ratio;
  const scale = mode === "cover" ? Math.max(1, needed) : Math.min(1, needed);
  // Rendered height as a percentage of the frame height.
  const heightPct = (scale * ratio) / imageAspect;
  return {
    scale,
    x: (1 - scale) * 50,
    y: (1 - heightPct) * 50,
  };
}
