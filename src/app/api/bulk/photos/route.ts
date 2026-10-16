import { NextResponse } from "next/server";
import { MAX_ZIP_BYTES, extractSheet, importWithPhotos, type RowImage } from "@/lib/bulk";
import { MAX_IMAGE_BYTES, contentTypeFor } from "@/lib/images";
import { isSignedIn } from "@/lib/session";

// Uploading a hundred photos is slow; keep it off the edge and give it room.
export const runtime = "nodejs";
export const maxDuration = 300;

/** Plenty for ~150 photos once the browser has resized them. */
const MAX_TOTAL_BYTES = 80 * 1024 * 1024;

/**
 * Imports a spreadsheet together with photos the browser has already lined up
 * against rows.
 *
 * The sheet is re-read here rather than trusting values posted back, so the
 * catalogue is always written from the file itself. The browser only decides
 * which photo goes with which row.
 */
export async function POST(request: Request) {
  if (!(await isSignedIn())) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const form = await request.formData();
  const sheet = form.get("sheet");

  if (!(sheet instanceof File) || sheet.size === 0) {
    return NextResponse.json({ error: "The spreadsheet is missing." }, { status: 400 });
  }
  if (sheet.size > MAX_ZIP_BYTES) {
    return NextResponse.json({ error: "That file is too large." }, { status: 413 });
  }

  // Photos arrive as photo_<rowNumber>_<position> so neither the pairing nor
  // the order within a product can drift in transit.
  const photosByRow = new Map<number, RowImage[]>();
  const positions = new Map<number, number[]>();
  let total = 0;

  for (const [field, value] of form.entries()) {
    if (!field.startsWith("photo_") || !(value instanceof File)) continue;

    const [rowPart, posPart] = field.slice("photo_".length).split("_");
    const rowNumber = Number(rowPart);
    const position = Number(posPart);

    if (!Number.isInteger(rowNumber) || rowNumber < 2 || !Number.isInteger(position)) {
      return NextResponse.json({ error: "Bad photo assignment." }, { status: 400 });
    }

    if (value.size > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { error: `"${value.name}" is larger than ${MAX_IMAGE_BYTES / 1024 / 1024}MB.` },
        { status: 413 },
      );
    }

    total += value.size;
    if (total > MAX_TOTAL_BYTES) {
      return NextResponse.json(
        { error: "That batch is too large. Split it in two and import twice." },
        { status: 413 },
      );
    }

    const contentType = value.type || contentTypeFor(value.name);
    if (!contentType) {
      return NextResponse.json(
        { error: `"${value.name}" is not an image we can use.` },
        { status: 400 },
      );
    }

    const list = photosByRow.get(rowNumber) ?? [];
    const order = positions.get(rowNumber) ?? [];
    list.push({
      bytes: new Uint8Array(await value.arrayBuffer()),
      contentType,
      label: value.name,
    });
    order.push(position);
    photosByRow.set(rowNumber, list);
    positions.set(rowNumber, order);
  }

  // FormData preserves order, but sort by the declared position anyway so the
  // cover photo is always the one the browser marked as first.
  for (const [rowNumber, list] of photosByRow) {
    const order = positions.get(rowNumber)!;
    const paired = list.map((image, i) => ({ image, position: order[i] }));
    paired.sort((a, b) => a.position - b.position);
    photosByRow.set(
      rowNumber,
      paired.map((p) => p.image),
    );
  }

  try {
    const buffer = await extractSheet(await sheet.arrayBuffer(), sheet.name);
    const report = await importWithPhotos(buffer, photosByRow);
    return NextResponse.json({ report });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Import failed." },
      { status: 400 },
    );
  }
}
