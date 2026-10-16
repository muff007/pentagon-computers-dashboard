/**
 * Shared parsing helpers for both the single-product form and the bulk upload,
 * so a value typed by hand and the same value in a spreadsheet end up identical
 * in the database.
 */

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

/** Strips currency symbols, commas and spaces before parsing. */
export function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const cleaned = String(value).replace(/[₹$,\s]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function toInt(value: unknown, fallback = 0): number {
  const n = toNumber(value);
  return n === null ? fallback : Math.max(0, Math.round(n));
}

/** Accepts yes/no, true/false, y/n, 1/0. */
export function toBool(value: unknown, fallback = false): boolean {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "boolean") return value;
  const s = String(value).trim().toLowerCase();
  if (["true", "yes", "y", "1"].includes(s)) return true;
  if (["false", "no", "n", "0"].includes(s)) return false;
  return fallback;
}

/**
 * Specifications, from either a JSON object or "Key: Value" lines.
 *
 * Staff type the line form; spreadsheets tend to carry the JSON form, and
 * either is accepted so nobody has to remember which.
 */
export function parseSpecs(input: unknown): Record<string, string> {
  if (!input) return {};

  if (typeof input === "object" && !Array.isArray(input)) {
    return Object.fromEntries(
      Object.entries(input as Record<string, unknown>).map(([k, v]) => [
        String(k).trim(),
        String(v).trim(),
      ]),
    );
  }

  const text = String(input).trim();
  if (!text) return {};

  if (text.startsWith("{")) {
    try {
      return parseSpecs(JSON.parse(text));
    } catch {
      // Fall through to line parsing — a malformed JSON blob is more likely a
      // typo than a deliberate single spec line.
    }
  }

  const out: Record<string, string> = {};
  for (const rawLine of text.split(/[\r\n]+/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const at = line.indexOf(":");
    if (at === -1) continue;
    const key = line.slice(0, at).trim();
    const value = line.slice(at + 1).trim();
    if (key && value) out[key] = value;
  }
  return out;
}

/** Turns a specs object back into the "Key: Value" lines the form shows. */
export function specsToLines(specs: Record<string, string> | null | undefined): string {
  return Object.entries(specs ?? {})
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
}
