"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  FileArchive,
  ImagePlus,
  Upload,
  X,
} from "lucide-react";
import { button, cardTitle } from "@/lib/ui";
import type { ImportReport, PreviewRow, SheetPreview } from "@/lib/bulk";

/**
 * Bulk import in two steps: the sheet, then the photos.
 *
 * Every product is its own drop target, laid out as a wall of tiles — like
 * folders in a drive. Photos are dragged onto whichever product they belong
 * to, however many at a time. Nothing is inferred from filenames or order,
 * because neither carries any information when the photos come off a phone in
 * a jumble.
 */

/** Longest edge after resizing. Big enough for the product page, small enough
 *  that several hundred photos still upload in one go. */
const MAX_EDGE = 1400;
const JPEG_QUALITY = 0.82;

type Photo = {
  id: string;
  name: string;
  /** Resized JPEG that actually gets uploaded. */
  file: File;
  previewUrl: string;
};

/** Draws the image down to MAX_EDGE and re-encodes it as JPEG. */
async function shrink(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not read that image.");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
  );
  if (!blob) throw new Error("Could not resize that image.");

  const base = file.name.replace(/\.[^.]+$/, "");
  return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
}

const isImage = (f: File) =>
  f.type.startsWith("image/") || /\.(jpe?g|png|webp|avif|gif)$/i.test(f.name);

export default function PhotoImport() {
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<SheetPreview | null>(null);

  /** Photos per spreadsheet row. The first of each is that product's cover. */
  const [photos, setPhotos] = useState<Map<number, Photo[]>>(new Map());

  const [reading, setReading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<ImportReport | null>(null);

  // Object URLs have to be released by hand or the tab leaks hundreds of images.
  const urls = useRef<string[]>([]);
  /** Monotonic id source. Math.random() in a render path is impure. */
  const seq = useRef(0);
  useEffect(
    () => () => {
      for (const url of urls.current) URL.revokeObjectURL(url);
    },
    [],
  );

  const importable = useMemo(
    () => (preview?.rows ?? []).filter((r) => !r.problem),
    [preview],
  );
  const blocked = useMemo(
    () => (preview?.rows ?? []).filter((r) => r.problem),
    [preview],
  );

  const totalPhotos = useMemo(
    () => [...photos.values()].reduce((n, list) => n + list.length, 0),
    [photos],
  );
  const withPhotos = useMemo(
    () => importable.filter((r) => (photos.get(r.row)?.length ?? 0) > 0).length,
    [importable, photos],
  );

  async function readSource(file: File) {
    setReading(true);
    setError(null);
    setReport(null);
    try {
      const body = new FormData();
      body.append("sheet", file);
      const response = await fetch("/api/bulk/preview", { method: "POST", body });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not read that file.");

      setSourceFile(file);
      setPreview(data.preview as SheetPreview);
      setPhotos(new Map());
    } catch (e) {
      setSourceFile(null);
      setPreview(null);
      setError(e instanceof Error ? e.message : "Could not read that file.");
    } finally {
      setReading(false);
    }
  }

  /** Resizes dropped files and appends them to one product. */
  async function addTo(rowNumber: number, files: File[]) {
    const picked = files.filter(isImage);
    if (picked.length === 0) return;

    setReading(true);
    const rejected: string[] = [];
    const next: Photo[] = [];

    for (const file of picked) {
      try {
        const resized = await shrink(file);
        const previewUrl = URL.createObjectURL(resized);
        urls.current.push(previewUrl);
        next.push({
          id: `p${(seq.current += 1)}`,
          name: file.name,
          file: resized,
          previewUrl,
        });
      } catch {
        rejected.push(file.name);
      }
    }

    setPhotos((prev) => {
      const map = new Map(prev);
      map.set(rowNumber, [...(map.get(rowNumber) ?? []), ...next]);
      return map;
    });

    setReading(false);
    setError(
      rejected.length > 0
        ? `Could not read ${rejected.length} file${rejected.length === 1 ? "" : "s"}. Save them as JPEG and drag them again.`
        : null,
    );
  }

  function removePhoto(rowNumber: number, photoId: string) {
    setPhotos((prev) => {
      const map = new Map(prev);
      map.set(rowNumber, (map.get(rowNumber) ?? []).filter((p) => p.id !== photoId));
      return map;
    });
  }

  /** Promotes a photo to cover by moving it to the front. */
  function makeCover(rowNumber: number, photoId: string) {
    setPhotos((prev) => {
      const map = new Map(prev);
      const list = map.get(rowNumber) ?? [];
      const photo = list.find((p) => p.id === photoId);
      if (!photo) return prev;
      map.set(rowNumber, [photo, ...list.filter((p) => p.id !== photoId)]);
      return map;
    });
  }

  async function runImport() {
    if (!sourceFile) return;
    setBusy(true);
    setError(null);
    setReport(null);

    try {
      const body = new FormData();
      body.append("sheet", sourceFile);
      for (const [rowNumber, list] of photos) {
        for (const [position, photo] of list.entries()) {
          body.append(`photo_${rowNumber}_${position}`, photo.file, photo.file.name);
        }
      }

      const response = await fetch("/api/bulk/photos", { method: "POST", body });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Import failed.");

      setReport(data.report as ImportReport);
      setPhotos(new Map());
      setPreview(null);
      setSourceFile(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* ---------- Step 1 ---------- */}
      <section className="panel overflow-hidden">
        <div className="border-b border-line bg-surface-2 px-4 py-2.5">
          <h2 className={cardTitle}>Step 1 — the product details</h2>
          <p className="mt-0.5 text-[11px] text-muted">
            The zip you already make, or just the spreadsheet on its own. Any
            images inside are ignored — photos go on in step 2.
          </p>
        </div>
        <div className="p-4">
          <label
            htmlFor="source"
            className="flex cursor-pointer items-center gap-3 rounded-card border-2 border-dashed border-line-strong px-4 py-5 transition-colors hover:border-brand-700 hover:bg-brand-50"
          >
            <FileArchive className="h-7 w-7 shrink-0 text-subtle" aria-hidden="true" />
            <span>
              <span className="block text-[13px] font-semibold">
                {sourceFile ? sourceFile.name : "Choose the .zip or spreadsheet"}
              </span>
              <span className="block text-[11px] text-muted">
                {preview
                  ? `${preview.rows.length} products read — click to change`
                  : ".zip, .xlsx, .xls or .csv"}
              </span>
            </span>
            <input
              id="source"
              type="file"
              accept=".zip,.xlsx,.xls,.csv"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) readSource(file);
              }}
            />
          </label>
          <a href="/api/template" className={`${button("subtle", "sm")} mt-3`}>
            Download spreadsheet template
          </a>
        </div>
      </section>

      {error && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-card border border-red-200 bg-red-50 px-3 py-2.5 text-[13px] text-red-800"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}

      {/* ---------- Step 2 ---------- */}
      {preview && (
        <section className="panel overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-surface-2 px-4 py-2.5">
            <div>
              <h2 className={cardTitle}>Step 2 — drag the photos onto each product</h2>
              <p className="mt-0.5 text-[11px] text-muted">
                Drop as many as you like on a product. The first one becomes its
                cover — click any photo to make it the cover instead.
              </p>
            </div>
            <span className="shrink-0 text-[11px] text-muted">
              <strong className="text-ink-900">{withPhotos}</strong> of{" "}
              {importable.length} products have photos ·{" "}
              <strong className="text-ink-900">{totalPhotos}</strong> in total
            </span>
          </div>

          {reading && (
            <p className="border-b border-line bg-brand-50 px-4 py-2 text-[13px] text-brand-800">
              Reading and resizing…
            </p>
          )}

          {/* The wall of products. Each tile is its own drop target. */}
          <ul className="grid list-none grid-cols-1 gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
            {importable.map((row) => (
              <ProductDrop
                key={row.row}
                row={row}
                photos={photos.get(row.row) ?? []}
                onAdd={(files) => addTo(row.row, files)}
                onRemove={(id) => removePhoto(row.row, id)}
                onCover={(id) => makeCover(row.row, id)}
              />
            ))}
          </ul>

          {blocked.length > 0 && (
            <div className="border-t border-line px-4 py-3">
              <p className="text-[13px] font-semibold text-amber-800">
                {blocked.length} row{blocked.length === 1 ? "" : "s"} cannot be
                imported and are not shown above:
              </p>
              <ul className="mt-1 space-y-0.5">
                {blocked.map((row) => (
                  <li key={row.row} className="text-[11px] text-muted">
                    Row {row.row} — {row.name}: {row.problem}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 border-t border-line p-4">
            <button
              type="button"
              onClick={runImport}
              disabled={busy || importable.length === 0}
              className={button("primary", "lg")}
            >
              <Upload className="h-4 w-4" aria-hidden="true" />
              {busy
                ? "Importing…"
                : `Import ${importable.length} products with ${totalPhotos} photos`}
            </button>
            {withPhotos < importable.length && (
              <span className="text-[13px] text-muted">
                {importable.length - withPhotos} product
                {importable.length - withPhotos === 1 ? "" : "s"} still have no
                photo — they will import without one.
              </span>
            )}
          </div>

          {busy && (
            <p className="px-4 pb-4 text-[13px] text-muted">
              Uploading the photos and writing the products. Leave this tab open.
            </p>
          )}
        </section>
      )}

      {report && <Report report={report} />}
    </div>
  );
}

/* ----------------------------------------------------------- product tile */

function ProductDrop({
  row,
  photos,
  onAdd,
  onRemove,
  onCover,
}: {
  row: PreviewRow;
  photos: Photo[];
  onAdd: (files: File[]) => void;
  onRemove: (id: string) => void;
  onCover: (id: string) => void;
}) {
  const [over, setOver] = useState(false);
  const inputId = `drop-${row.row}`;

  return (
    <li
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        onAdd([...e.dataTransfer.files]);
      }}
      className={`flex flex-col rounded-card border-2 transition-colors ${
        over
          ? "border-brand-700 bg-brand-50"
          : photos.length > 0
            ? "border-line bg-white"
            : "border-dashed border-line-strong bg-surface-2"
      }`}
    >
      <div className="border-b border-line px-3 py-2">
        <p className="truncate text-[13px] font-semibold">{row.name}</p>
        <p className="truncate text-[11px] text-subtle">
          {row.brand ? `${row.brand} · ` : ""}
          {row.price !== null ? `₹${row.price.toLocaleString("en-IN")}` : ""}
          {photos.length > 0
            ? ` · ${photos.length} photo${photos.length === 1 ? "" : "s"}`
            : ""}
        </p>
        {row.note && <p className="truncate text-[11px] text-brand-700">{row.note}</p>}
      </div>

      <div className="flex-1 p-2.5">
        {photos.length === 0 ? (
          <label
            htmlFor={inputId}
            className="flex h-24 cursor-pointer flex-col items-center justify-center gap-1 text-center"
          >
            <ImagePlus className="h-5 w-5 text-subtle" aria-hidden="true" />
            <span className="text-[11px] text-muted">
              Drag photos here, or click to choose
            </span>
          </label>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {photos.map((photo, i) => (
              <span key={photo.id} className="group relative">
                <button
                  type="button"
                  onClick={() => onCover(photo.id)}
                  title={i === 0 ? "This is the cover" : "Make this the cover"}
                  className="block"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.previewUrl}
                    alt=""
                    className={`h-16 w-16 border bg-surface-2 object-contain ${
                      i === 0 ? "border-2 border-brand-700" : "border-line"
                    }`}
                  />
                </button>
                {i === 0 && (
                  <span className="pointer-events-none absolute bottom-0 left-0 bg-brand-700 px-1 text-[9px] font-bold text-white">
                    cover
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => onRemove(photo.id)}
                  aria-label={`Remove ${photo.name}`}
                  className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-ink-900 text-white opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <X className="h-2.5 w-2.5" aria-hidden="true" />
                </button>
              </span>
            ))}

            <label
              htmlFor={inputId}
              className="grid h-16 w-16 cursor-pointer place-items-center border border-dashed border-line-strong text-subtle hover:border-brand-700 hover:text-brand-700"
              title="Add more photos"
            >
              <ImagePlus className="h-4 w-4" aria-hidden="true" />
            </label>
          </div>
        )}

        <input
          id={inputId}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(e) => {
            if (e.target.files?.length) onAdd([...e.target.files]);
            e.target.value = "";
          }}
        />
      </div>
    </li>
  );
}

/* --------------------------------------------------------------- report */

const STATUS_STYLE: Record<string, string> = {
  created: "bg-green-100 text-green-800",
  updated: "bg-brand-100 text-brand-800",
  skipped: "bg-ink-100 text-ink-600",
  failed: "bg-red-100 text-red-800",
};

function Report({ report }: { report: ImportReport }) {
  return (
    <section className="panel overflow-hidden">
      <div className="flex items-center gap-2 border-b border-line bg-surface-2 px-4 py-2.5">
        <CheckCircle2 className="h-4 w-4 text-ok" aria-hidden="true" />
        <h2 className={cardTitle}>Import finished</h2>
      </div>
      {report.galleryUnavailable ? (
        <p className="border-b border-line bg-amber-50 px-4 py-2.5 text-[13px] text-amber-900">
          <strong>Only the cover photo was kept.</strong>{" "}
          {report.galleryUnavailable} extra photo
          {report.galleryUnavailable === 1 ? " was" : "s were"} dropped because the
          gallery column does not exist yet — run{" "}
          <code className="rounded bg-amber-100 px-1 font-mono text-[11px]">
            supabase/product-gallery.sql
          </code>{" "}
          and import again.
        </p>
      ) : null}
      <div className="grid grid-cols-3 divide-x divide-line border-b border-line sm:grid-cols-5">
        {[
          [report.created, "Created"],
          [report.updated, "Updated"],
          [report.failed, "Failed"],
          [report.imagesAttached, "Photos"],
          [report.totalRows, "Rows"],
        ].map(([value, label]) => (
          <div key={String(label)} className="px-4 py-3 text-center">
            <p className="text-xl font-bold tabular-nums">{value}</p>
            <p className="mt-0.5 text-[11px] text-muted">{label}</p>
          </div>
        ))}
      </div>
      <div className="max-h-80 overflow-auto">
        <table className="w-full min-w-[560px] border-collapse text-[13px]">
          <thead>
            <tr className="table-head border-b border-line text-left text-[11px] uppercase tracking-wider text-subtle">
              <th className="px-3 py-2 font-semibold">Row</th>
              <th className="px-3 py-2 font-semibold">Product</th>
              <th className="px-3 py-2 font-semibold">Result</th>
              <th className="px-3 py-2 font-semibold">Detail</th>
            </tr>
          </thead>
          <tbody>
            {report.results.map((r) => (
              <tr key={r.row} className="border-b border-line last:border-0">
                <td className="px-3 py-2 tabular-nums text-subtle">{r.row}</td>
                <td className="px-3 py-2 font-medium">{r.name}</td>
                <td className="px-3 py-2">
                  <span
                    className={`inline-flex rounded-sm px-1.5 py-0.5 text-[10px] font-bold uppercase ${STATUS_STYLE[r.status]}`}
                  >
                    {r.status}
                  </span>
                </td>
                <td className="px-3 py-2 text-muted">{r.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
