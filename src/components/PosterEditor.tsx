"use client";

import { useState } from "react";
import { Monitor, Move, RotateCcw } from "lucide-react";
import PosterCrop from "@/components/PosterCrop";
import PosterPreview from "@/components/PosterPreview";
import { button } from "@/lib/ui";
import {
  DEFAULT_RATIO,
  fitLayout,
  type PosterLayout,
  type PosterPlacement,
} from "@/lib/types";

/**
 * Arrange on the left, see the real page on the right.
 *
 * Everything about how the poster sits is adjustable: where the artwork is,
 * how big it is, how much space it takes on the page, and what shows behind
 * it. The numbers are exposed too, so an arrangement can be repeated exactly
 * on another poster.
 */
export default function PosterEditor({
  src,
  placement,
  value,
  onChange,
}: {
  src: string | null;
  placement: PosterPlacement;
  value: PosterLayout;
  onChange: (next: PosterLayout) => void;
}) {
  const [aspect, setAspect] = useState<number | null>(null);

  if (!src) {
    return (
      <div className="grid h-40 place-items-center rounded-card border border-dashed border-line-strong bg-surface-2 text-[13px] text-muted">
        Choose an image to arrange it and see it on the website
      </div>
    );
  }

  const fit = (mode: "cover" | "contain") => {
    if (!aspect) return;
    onChange({ ...value, ...fitLayout(mode, value.ratio, aspect) });
  };

  const shape = (ratio: number) => {
    const next = { ...value, ratio };
    onChange(aspect ? { ...next, ...fitLayout("cover", ratio, aspect) } : next);
  };

  const nudge = (patch: Partial<PosterLayout>) => onChange({ ...value, ...patch });

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* ------------------------------------------------ arrange */}
      <div>
        <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-ink-700">
          <Move className="h-3 w-3" aria-hidden="true" />
          Drag the picture · scroll to resize it · pull the grey handles to
          resize the space
        </p>

        <PosterCrop src={src} value={value} onChange={onChange} onImage={setAspect} />

        <div className="mt-2 space-y-2.5 rounded-card border border-line bg-surface-2 p-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-ink-700">Picture</span>
            <button type="button" onClick={() => fit("cover")} className={button("subtle", "xs")}>
              Fill the space
            </button>
            <button type="button" onClick={() => fit("contain")} className={button("subtle", "xs")}>
              Fit it all in
            </button>
            <button
              type="button"
              onClick={() => nudge({ x: (1 - value.scale) * 50 })}
              className={button("subtle", "xs")}
            >
              Centre across
            </button>
          </div>

          <label className="block">
            <span className="text-[11px] font-semibold text-ink-700">
              Size — {Math.round(value.scale * 100)}%
            </span>
            <input
              type="range"
              min={5}
              max={400}
              step={1}
              value={Math.round(value.scale * 100)}
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
                value={value.bg}
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
                onChange({
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
            shape {value.ratio.toFixed(2)}:1 · size {Math.round(value.scale * 100)}% ·
            x {value.x.toFixed(1)}% · y {value.y.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* ------------------------------------------------ preview */}
      <div>
        <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-ink-700">
          <Monitor className="h-3 w-3" aria-hidden="true" />
          Live preview of the website
        </p>
        <PosterPreview src={src} placement={placement} layout={value} />
        <p className="mt-1.5 text-[11px] text-muted">
          Updates as you drag. This is how shoppers will see it.
        </p>
      </div>
    </div>
  );
}
