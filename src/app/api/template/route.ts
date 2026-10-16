import * as XLSX from "xlsx";
import { isSignedIn } from "@/lib/session";

export const runtime = "nodejs";

/** Downloads a starter spreadsheet with the exact columns the importer reads. */
export async function GET() {
  if (!(await isSignedIn())) {
    return new Response("Not signed in.", { status: 401 });
  }

  const example = [
    {
      name: "HP Victus 15 Gaming",
      slug: "",
      brand: "HP",
      category: "Laptops",
      price: 62990,
      mrp: 74999,
      stock: 14,
      short_desc: "Core i5 13th Gen with RTX 3050",
      description: "A no-nonsense entry into 1080p gaming.",
      specs: "Processor: Intel Core i5-13420H\nRAM: 16GB DDR4\nStorage: 512GB NVMe SSD",
      rating: 4.3,
      rating_count: 412,
      is_featured: "yes",
      is_active: "yes",
    },
  ];

  const sheet = XLSX.utils.json_to_sheet(example);
  sheet["!cols"] = [
    { wch: 30 }, { wch: 22 }, { wch: 10 }, { wch: 14 }, { wch: 10 },
    { wch: 10 }, { wch: 8 }, { wch: 38 }, { wch: 46 }, { wch: 46 },
    { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 28 },
  ];

  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "products");
  const body = XLSX.write(book, { type: "buffer", bookType: "xlsx" }) as Buffer;

  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="pentagon-product-template.xlsx"',
    },
  });
}
