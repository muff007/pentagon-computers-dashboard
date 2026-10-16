import { NextResponse } from "next/server";
import { MAX_ZIP_BYTES, extractSheet, previewSheet } from "@/lib/bulk";
import { isSignedIn } from "@/lib/session";

export const runtime = "nodejs";

/**
 * Reads a spreadsheet and reports what it contains. Writes nothing.
 *
 * The photo-matching screen calls this to lay the rows out, so the shop can
 * line photos up against real product names and see bad rows before anything
 * reaches the catalogue.
 */
export async function POST(request: Request) {
  if (!(await isSignedIn())) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const form = await request.formData();
  const sheet = form.get("sheet");

  if (!(sheet instanceof File) || sheet.size === 0) {
    return NextResponse.json(
      { error: "Choose the spreadsheet first." },
      { status: 400 },
    );
  }
  if (sheet.size > MAX_ZIP_BYTES) {
    return NextResponse.json({ error: "That file is too large." }, { status: 413 });
  }

  try {
    const buffer = await extractSheet(await sheet.arrayBuffer(), sheet.name);
    const preview = await previewSheet(buffer);
    return NextResponse.json({ preview });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not read that spreadsheet." },
      { status: 400 },
    );
  }
}
