/**
 * Builds a throwaway zip that exercises the bulk importer: a spreadsheet plus
 * images whose filenames match the product names.
 *
 *   node scripts/make-test-zip.mjs out.zip
 */
import JSZip from "jszip";
import * as XLSX from "xlsx";
import { writeFile } from "node:fs/promises";

const out = process.argv[2] ?? "test-upload.zip";

const rows = [
  {
    name: "Zzz Test Laptop Alpha",
    brand: "HP",
    category: "Laptops",
    price: "₹49,999",
    mrp: 59999,
    stock: 7,
    short_desc: "Import test row one",
    description: "Created by scripts/make-test-zip.mjs.",
    specs: "Processor: Test CPU\nRAM: 16GB\nStorage: 512GB",
    rating: 4.2,
    rating_count: 11,
    is_featured: "yes",
    is_active: "yes",
    image: "Zzz Test Laptop Alpha.png",
  },
  {
    // No image file for this one — should report the image as missing.
    name: "Zzz Test Printer Beta",
    brand: "HP",
    category: "Printers",
    price: 8999,
    stock: 3,
    short_desc: "Import test row two",
    specs: "Type: Test\nWarranty: 1 Year",
    is_active: "yes",
    image: "Zzz Test Printer Beta.png",
  },
  {
    // Deliberately broken: unknown brand, so the row must fail cleanly.
    name: "Zzz Test Broken Gamma",
    brand: "NotARealBrand",
    price: 100,
  },
  {
    // Deliberately broken: no price.
    name: "Zzz Test Priceless Delta",
    brand: "Acer",
  },
];

const sheet = XLSX.utils.json_to_sheet(rows);
const book = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(book, sheet, "products");
const xlsxBuffer = XLSX.write(book, { type: "buffer", bookType: "xlsx" });

/** Smallest valid PNG: a single opaque pixel. */
const PIXEL_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

const zip = new JSZip();
zip.file("products.xlsx", xlsxBuffer);
zip.file("Zzz Test Laptop Alpha.png", PIXEL_PNG);
// Matched case-insensitively and ignoring punctuation, so this still finds
// "Zzz Test Laptop Alpha" if the sheet had named it differently.
zip.file("images/unused-extra.png", PIXEL_PNG);

await writeFile(out, await zip.generateAsync({ type: "nodebuffer" }));
console.log("wrote", out);
