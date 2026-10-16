"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { AlertCircle } from "lucide-react";
import {
  createPoster,
  updatePoster,
  type PosterFormState,
} from "@/lib/actions/posters";
import PosterEditor from "@/components/PosterEditor";
import { button, cardTitle, field, label } from "@/lib/ui";
import {
  PLACEMENT_HINTS,
  PLACEMENT_LABELS,
  DEFAULT_LAYOUT,
  DEFAULT_RATIO,
  POSTER_PLACEMENTS,
  posterLayout,
  type Poster,
  type PosterLayout,
  type PosterPlacement,
} from "@/lib/types";

/** A timestamptz rendered for <input type="datetime-local">. */
function forInput(value: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="panel overflow-hidden">
      <div className="border-b border-line bg-surface-2 px-4 py-2.5">
        <h2 className={cardTitle}>{title}</h2>
        {hint && <p className="mt-0.5 text-[11px] text-muted">{hint}</p>}
      </div>
      <div className="grid gap-4 p-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

export default function PosterForm({ poster }: { poster?: Poster }) {
  const action = poster ? updatePoster : createPoster;
  const [state, formAction, pending] = useActionState<PosterFormState, FormData>(
    action,
    {},
  );

  const [placement, setPlacement] = useState<PosterPlacement>(
    poster?.placement ?? "home",
  );
  // Local preview so staff can see what they picked before saving.
  const [preview, setPreview] = useState<string | null>(poster?.image_url ?? null);
  // Starts filling the width of the slot this placement normally uses.
  const [layout, setLayout] = useState<PosterLayout>(
    posterLayout(poster?.layout) ?? {
      ...DEFAULT_LAYOUT,
      ratio: DEFAULT_RATIO[poster?.placement ?? "home"],
    },
  );

  return (
    <form action={formAction} className="mt-5 space-y-4">
      {poster && <input type="hidden" name="id" value={poster.id} />}

      {state.error && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-card border border-red-200 bg-red-50 px-3 py-2.5 text-[13px] text-red-800"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {state.error}
        </p>
      )}

      <Section title="Poster">
        <div className="sm:col-span-2">
          <label htmlFor="title" className={label}>
            Title *
          </label>
          <input
            id="title"
            name="title"
            required
            defaultValue={poster?.title}
            placeholder="Diwali offer — 10% off all laptops"
            className={`${field} mt-1.5`}
          />
          <p className="mt-1 text-[11px] text-muted">
            Only you see this. It is how you find the poster in the list later.
          </p>
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="image" className={label}>
            Image {poster ? "(leave empty to keep the current one)" : "*"}
          </label>
          <input
            id="image"
            name="image"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/avif,image/gif"
            required={!poster}
            onChange={(e) => {
              const file = e.target.files?.[0];
              setPreview(file ? URL.createObjectURL(file) : poster?.image_url ?? null);
            }}
            className={`${field} mt-1.5 file:mr-3 file:rounded-card file:border-0 file:bg-ink-100 file:px-3 file:py-1 file:text-[13px]`}
          />
          <p className="mt-1 text-[11px] text-muted">
            PNG, JPEG, WebP, AVIF or GIF, up to 8MB.
          </p>

          <div className="mt-3">
            <p className="mb-1.5 text-[11px] font-semibold text-ink-700">
              How it will look on the website
            </p>
            <PosterEditor
              src={preview}
              placement={placement}
              value={layout}
              onChange={setLayout}
            />
          </div>

          <input type="hidden" name="layout" value={JSON.stringify(layout)} />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="link_url" className={label}>
            Link (optional)
          </label>
          <input
            id="link_url"
            name="link_url"
            defaultValue={poster?.link_url ?? ""}
            placeholder="/store?category=laptops"
            className={`${field} mt-1.5`}
          />
          <p className="mt-1 text-[11px] text-muted">
            Where the poster goes when tapped. Leave blank for a plain image.
          </p>
        </div>
      </Section>

      <Section title="Where it shows">
        <div>
          <label htmlFor="placement" className={label}>
            Placement
          </label>
          <select
            id="placement"
            name="placement"
            value={placement}
            onChange={(e) => setPlacement(e.target.value as PosterPlacement)}
            className={`${field} mt-1.5`}
          >
            {POSTER_PLACEMENTS.map((p) => (
              <option key={p} value={p}>
                {PLACEMENT_LABELS[p]}
              </option>
            ))}
          </select>
          <p className="mt-1 text-[11px] text-muted">{PLACEMENT_HINTS[placement]}</p>
        </div>

        <div>
          <label htmlFor="sort_order" className={label}>
            Order
          </label>
          <input
            id="sort_order"
            name="sort_order"
            type="number"
            defaultValue={poster?.sort_order ?? 0}
            className={`${field} mt-1.5`}
          />
          <p className="mt-1 text-[11px] text-muted">
            Lower numbers show first. Ties fall back to newest first.
          </p>
        </div>

        <div>
          <label htmlFor="starts_at" className={label}>
            Starts (optional)
          </label>
          <input
            id="starts_at"
            name="starts_at"
            type="datetime-local"
            defaultValue={forInput(poster?.starts_at ?? null)}
            className={`${field} mt-1.5`}
          />
        </div>

        <div>
          <label htmlFor="ends_at" className={label}>
            Ends (optional)
          </label>
          <input
            id="ends_at"
            name="ends_at"
            type="datetime-local"
            defaultValue={forInput(poster?.ends_at ?? null)}
            className={`${field} mt-1.5`}
          />
          <p className="mt-1 text-[11px] text-muted">
            Outside these dates the poster hides itself automatically.
          </p>
        </div>

        <label className="flex items-center gap-2 text-[13px] sm:col-span-2">
          <input
            type="checkbox"
            name="is_active"
            defaultChecked={poster ? poster.is_active : true}
            className="h-4 w-4"
          />
          Live on the website
        </label>
      </Section>

      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={pending} className={button("primary", "md")}>
          {pending ? "Saving…" : poster ? "Save poster" : "Add poster"}
        </button>
        <Link href="/posters" className={button("subtle", "md")}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
