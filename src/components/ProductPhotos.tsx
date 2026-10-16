"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Star, X } from "lucide-react";

/**
 * All of a product's photos in one place: the cover and the gallery together.
 *
 * Existing photos and newly chosen ones sit in the same list, so a photo added
 * today can be made the cover before saving. Order is what decides the cover —
 * first wins — which is the same rule the bulk importer uses.
 *
 * The form posts two things: `photo_order`, listing every photo in order as
 * either an existing URL or a pointer into the new files, and `new_photos`,
 * whose FileList is rebuilt to match that order.
 */

type Photo =
  | { id: string; kind: "existing"; url: string }
  | { id: string; kind: "new"; file: File; preview: string };

export default function ProductPhotos({
  cover,
  gallery,
}: {
  cover: string | null;
  gallery: string[];
}) {
  const [photos, setPhotos] = useState<Photo[]>(() =>
    [cover, ...gallery]
      .filter((u): u is string => Boolean(u))
      .map((url, i) => ({ id: `e${i}`, kind: "existing", url })),
  );

  const fileInput = useRef<HTMLInputElement>(null);
  const seq = useRef(0);
  const urls = useRef<string[]>([]);

  useEffect(
    () => () => {
      for (const u of urls.current) URL.revokeObjectURL(u);
    },
    [],
  );

  /**
   * Keeps the hidden file input in step with our list, so the server receives
   * the new files in exactly the order shown on screen.
   */
  useEffect(() => {
    const input = fileInput.current;
    if (!input) return;
    const dt = new DataTransfer();
    for (const p of photos) if (p.kind === "new") dt.items.add(p.file);
    input.files = dt.files;
  }, [photos]);

  /** Describes the list for the server: existing URLs and new-file pointers. */
  const order = (() => {
    let n = 0;
    return photos.map((p) =>
      p.kind === "existing" ? `existing:${p.url}` : `new:${n++}`,
    );
  })();

  function add(files: FileList) {
    const next: Photo[] = [];
    for (const file of [...files]) {
      if (!file.type.startsWith("image/")) continue;
      const preview = URL.createObjectURL(file);
      urls.current.push(preview);
      next.push({ id: `n${(seq.current += 1)}`, kind: "new", file, preview });
    }
    setPhotos((prev) => [...prev, ...next]);
  }

  const remove = (id: string) =>
    setPhotos((prev) => prev.filter((p) => p.id !== id));

  const makeCover = (id: string) =>
    setPhotos((prev) => {
      const hit = prev.find((p) => p.id === id);
      return hit ? [hit, ...prev.filter((p) => p.id !== id)] : prev;
    });

  return (
    <div className="sm:col-span-2">
      <input type="hidden" name="photo_order" value={JSON.stringify(order)} />
      <input
        ref={fileInput}
        type="file"
        name="new_photos"
        multiple
        accept="image/png,image/jpeg,image/webp,image/avif"
        className="sr-only"
        tabIndex={-1}
      />

      {photos.length > 0 && (
        <ul className="mb-3 flex flex-wrap gap-2">
          {photos.map((photo, i) => (
            <li key={photo.id} className="group relative">
              <button
                type="button"
                onClick={() => makeCover(photo.id)}
                title={i === 0 ? "This is the cover" : "Make this the cover"}
                className="block"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.kind === "existing" ? photo.url : photo.preview}
                  alt=""
                  className={`h-24 w-24 border bg-surface-2 object-contain ${
                    i === 0 ? "border-2 border-brand-700" : "border-line"
                  }`}
                />
              </button>

              {i === 0 ? (
                <span className="pointer-events-none absolute bottom-0 left-0 flex items-center gap-0.5 bg-brand-700 px-1 text-[9px] font-bold text-white">
                  <Star className="h-2.5 w-2.5" aria-hidden="true" />
                  Cover
                </span>
              ) : (
                <span className="pointer-events-none absolute bottom-0 left-0 bg-ink-900/70 px-1 text-[9px] text-white">
                  {i + 1}
                </span>
              )}

              {photo.kind === "new" && (
                <span className="pointer-events-none absolute right-0 top-0 bg-green-600 px-1 text-[9px] font-bold text-white">
                  new
                </span>
              )}

              <button
                type="button"
                onClick={() => remove(photo.id)}
                aria-label="Remove this photo"
                className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-ink-900 text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <label
        htmlFor="add-photos"
        className="flex cursor-pointer items-center gap-2.5 rounded-card border-2 border-dashed border-line-strong px-4 py-3 transition-colors hover:border-brand-700 hover:bg-brand-50"
      >
        <ImagePlus className="h-5 w-5 shrink-0 text-subtle" aria-hidden="true" />
        <span className="text-[13px]">
          <span className="block font-semibold">
            {photos.length > 0 ? "Add more photos" : "Add photos"}
          </span>
          <span className="block text-[11px] text-muted">
            PNG, JPEG, WebP or AVIF, up to 8MB each. Click a photo to make it the
            cover; the cover is what shows on product cards and in the cart.
          </span>
        </span>
      </label>
      <input
        id="add-photos"
        type="file"
        multiple
        accept="image/png,image/jpeg,image/webp,image/avif"
        className="sr-only"
        onChange={(e) => {
          if (e.target.files?.length) add(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
