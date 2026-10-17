"use client";

import { useState } from "react";
import { Monitor, Move, RotateCcw, Smartphone, Tablet } from "lucide-react";
import PosterCrop from "@/components/PosterCrop";
import PosterPreview from "@/components/PosterPreview";
import { button } from "@/lib/ui";
import {
  DEFAULT_RATIO,
  DEVICE_LABEL,
  DEVICE_PREVIEW_WIDTH,
  POSTER_DEVICES,
  effectiveLayout,
  fitLayout,
  type DeviceLayouts,
  type PosterDevice,
  type PosterLayout,
  type PosterPlacement,
} from "@/lib/types";

/**
 * Arrange on the left, see the real page on the right — once per screen size.
 *
 * Desktop is always set. Tablet and phone start out following the size above
 * them and only become their own arrangement when the shop changes something.
 * A poster that already looks right everywhere therefore needs arranging
 * exactly once, and only the awkward ones cost more than that.
 */

const DEVICE_ICON = {
  desktop: Monitor,
  tablet: Tablet,
  phone: Smartphone,
} as const;

export default function PosterEditor({
  src,
  placement,
  value,
  onChange,
}: {
  src: string | null;
  placement: PosterPlacement;
  value: DeviceLayouts;
  onChange: (next: DeviceLayouts) => void;
}) {
  const [aspect, setAspect] = useState<number | null>(null);
  const [device, setDevice] = useState<PosterDevice>("desktop");

  if (!src) {
    return (
      <div className="grid h-40 place-items-center rounded-card border border-dashed border-line-strong bg-surface-2 text-[13px] text-muted">
        Choose an image to arrange it and see it on the website
      </div>
    );
  }

  // What this screen shows right now, whether it owns that or inherits it.
  const shown = effectiveLayout(value, device);
  const inherited = device !== "desktop" && value[device] === null;
  const copies = device === "phone" && value.tablet ? "tablet" : "desktop";

  /** Editing an inherited screen starts it from whatever it already showed. */
  const write = (next: PosterLayout) =>
    onChange(
      device === "desktop"
        ? { ...value, desktop: next }
        : { ...value, [device]: next },
    );

  const nudge = (patch: Partial<PosterLayout>) => write({ ...shown, ...patch });

  const fit = (mode: "cover" | "contain") => {
    if (!aspect) return;
    write({ ...shown, ...fitLayout(mode, shown.ratio, aspect) });
  };

  const shape = (ratio: number) => {
    const next = { ...shown, ratio };
    write(aspect ? { ...next, ...fitLayout("cover", ratio, aspect) } : next);
  };

  return (
    <div className="space-y-3">
      {/* ------------------------------------------------ screen size */}
      <div className="flex flex-wrap items-center gap-1.5 rounded-card border border-line bg-surface-2 p-2">
        <span className="text-[11px] font-semibold text-ink-700">Arranging for</span>
        {POSTER_DEVICES.map((d) => {
          const Icon = DEVICE_ICON[d];
          const own = d === "desktop" || value[d] !== null;
          return (
            <button
              key={d}
              type="button"
              onClick={() => setDevice(d)}
              aria-pressed={device === d}
              className={`inline-flex items-center gap-1.5 rounded-card px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                device === d
                  ? "bg-brand-700 text-white"
                  : "bg-white text-ink-700 hover:bg-ink-100"
              }`}
            >
              <Icon className="h-3 w-3" aria-hidden="true" />
              {DEVICE_LABEL[d]}
              {/* A filled dot means this screen has its own arrangement. */}
              <span
                className={`ml-0.5 h-1.5 w-1.5 rounded-full ${
                  own ? (device === d ? "bg-white" : "bg-brand-700") : "bg-transparent"
                }`}
                aria-hidden="true"
              />
            </button>
          );
        })}
        <span className="ml-auto font-mono text-[10px] text-subtle">
          {DEVICE_PREVIEW_WIDTH[device]}px wide
        </span>
      </div>

      {inherited && (
        <p className="rounded-card border border-amber-200 bg-amber-50 px-2.5 py-2 text-[11px] leading-relaxed text-amber-900">
          {DEVICE_LABEL[device]} copies {copies} at the moment. Change anything
          below and it becomes its own arrangement.
        </p>
      )}

      {!inherited && device !== "desktop" && (
        <div className="flex flex-wrap items-center gap-2 rounded-card border border-line bg-surface-2 px-2.5 py-2 text-[11px] text-ink-700">
          <span>{DEVICE_LABEL[device]} has its own arrangement.</span>
          <button
            type="button"
            onClick={() => onChange({ ...value, [device]: null })}
            className={`${button("subtle", "xs")} ml-auto`}
          >
            Go back to copying {copies}
          </button>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* ------------------------------------------------ arrange */}
        <div>
          <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-ink-700">
            <Move className="h-3 w-3" aria-hidden="true" />
            Drag the picture · scroll to resize it · pull the grey handles to
            resize the space
          </p>

          <PosterCrop src={src} value={shown} onChange={write} onImage={setAspect} />

          <div className="mt-2 space-y-2.5 rounded-card border border-line bg-surface-2 p-2.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-semibold text-ink-700">Picture</span>
              <button
                type="button"
                onClick={() => fit("cover")}
                className={button("subtle", "xs")}
              >
                Fill the space
              </button>
              <button
                type="button"
                onClick={() => fit("contain")}
                className={button("subtle", "xs")}
              >
                Fit it all in
              </button>
              <button
                type="button"
                onClick={() => nudge({ x: (1 - shown.scale) * 50 })}
                className={button("subtle", "xs")}
              >
                Centre across
              </button>
            </div>

            <label className="block">
              <span className="text-[11px] font-semibold text-ink-700">
                Size — {Math.round(shown.scale * 100)}%
              </span>
              <input
                type="range"
                min={5}
                max={400}
                step={1}
                value={Math.round(shown.scale * 100)}
                onChange={(e) => nudge({ scale: Number(e.target.value) / 100 })}
                className="mt-1 w-full accent-brand-700"
              />
            </label>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-semibold text-ink-700">Space</span>
              {(
                [
                  ["Wide strip", DEFAULT_RATIO.hero],
                  ["Banner", DEFAULT_RATIO.home],
                  ["Landscape", 1.5],
                  ["Square", 1],
                  // Phones are tall; a wide strip on one is a letterbox.
                  ["Tall", 0.8],
                ] as const
              ).map(([labelText, ratio]) => (
                <button
                  key={labelText}
                  type="button"
                  onClick={() => shape(ratio)}
                  className={button("subtle", "xs")}
                >
                  {labelText}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-1.5 text-[11px] font-semibold text-ink-700">
                Behind
                <input
                  type="color"
                  value={shown.bg}
                  onChange={(e) => nudge({ bg: e.target.value })}
                  className="h-6 w-8 cursor-pointer border border-line bg-white"
                />
              </label>
              {["#ffffff", "#111418", "#1d4ed8", "#facc15"].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => nudge({ bg: c })}
                  style={{ background: c }}
                  aria-label={`Background ${c}`}
                  className="h-5 w-5 border border-line-strong"
                />
              ))}

              <button
                type="button"
                onClick={() =>
                  write({
                    ratio: DEFAULT_RATIO[placement],
                    scale: 1,
                    x: 0,
                    y: 0,
                    bg: "#ffffff",
                  })
                }
                className={`${button("subtle", "xs")} ml-auto`}
              >
                <RotateCcw className="h-3 w-3" aria-hidden="true" />
                Reset
              </button>
            </div>

            <p className="font-mono text-[10px] text-subtle">
              shape {shown.ratio.toFixed(2)}:1 · size {Math.round(shown.scale * 100)}% ·
              x {shown.x.toFixed(1)}% · y {shown.y.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* ------------------------------------------------ preview */}
        <div>
          <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-ink-700">
            <Monitor className="h-3 w-3" aria-hidden="true" />
            The website on a {DEVICE_LABEL[device].toLowerCase()}
          </p>
          <PosterPreview src={src} placement={placement} layout={shown} device={device} />
          <p className="mt-1.5 text-[11px] text-muted">
            Updates as you drag. This is how shoppers on a{" "}
            {DEVICE_LABEL[device].toLowerCase()} will see it.
          </p>
        </div>
      </div>
    </div>
  );
}
