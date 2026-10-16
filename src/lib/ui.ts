const focus =
  "outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:ring-offset-1";

const BASE = `inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-card font-semibold transition-colors disabled:pointer-events-none disabled:opacity-45 ${focus}`;

const VARIANTS = {
  primary: "bg-brand-700 text-white hover:bg-brand-800",
  dark: "bg-ink-900 text-white hover:bg-ink-800",
  outline: "border border-ink-300 bg-white text-ink-800 hover:border-ink-900 hover:bg-ink-50",
  subtle: "border border-line bg-surface-2 text-ink-700 hover:bg-white",
  ghost: "text-ink-600 hover:bg-ink-100 hover:text-ink-900",
  danger: "border border-red-200 bg-red-50 text-bad hover:bg-red-100",
} as const;

const SIZES = {
  xs: "h-7 px-2.5 text-[11px]",
  sm: "h-8 px-3 text-xs",
  md: "h-9 px-3.5 text-[13px]",
  lg: "h-10 px-5 text-sm",
} as const;

export type ButtonVariant = keyof typeof VARIANTS;
export type ButtonSize = keyof typeof SIZES;

export function button(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  extra = "",
) {
  return `${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${extra}`.trim();
}

const FIELD_BASE = `rounded-card border border-line bg-white px-3 py-2 text-[13px] text-ink-900 transition-colors placeholder:text-subtle hover:border-line-strong focus:border-brand-700 ${focus}`;

export const field = `w-full ${FIELD_BASE}`;

/** Same look, but sized by its content — for selects sitting in a filter row. */
export const fieldInline = FIELD_BASE;

export const label = "block text-xs font-semibold text-ink-700";

export const pageTitle = "text-xl font-bold tracking-tight";

export const cardTitle = "text-[13px] font-bold uppercase tracking-[0.06em]";
