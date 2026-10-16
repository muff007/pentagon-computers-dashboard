"use client";

import { useEffect, useRef, useState } from "react";
import PosterFrame from "@/components/PosterFrame";
import type { PosterLayout } from "@/lib/types";

/**
 * The stage where a poster is arranged.
 *
 * Drag the artwork to move it. Scroll, pinch or use the slider to resize it.
 * Pull the frame's edge handles to change the shape of the space it occupies
 * on the page. The artwork is free of the frame, so it can be made smaller
 * than the frame on purpose — a logo centred on white is a perfectly good
 * banner, and a crop-only tool cannot express that.
 */

type Edge = "e" | "s" | "se";

export default function PosterCrop({
  src,
  value,
  onChange,
  onImage,
}: {
  src: string;
  value: PosterLayout;
  onChange: (next: PosterLayout) => void;
  /** Reports the artwork's own proportions once known. */
  onImage?: (aspect: number) => void;
}) {
  const frame = useRef<HTMLDivElement>(null);
  // The whole gesture lives in one piece of state: what is being dragged, and
  // the arrangement it started from.
  const [drag, setDrag] = useState<{
    mode: "image" | Edge;
    px: number;
    py: number;
    from: PosterLayout;
  } | null>(null);

  const begin = (mode: "image" | Edge) => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDrag({ mode, px: e.clientX, py: e.clientY, from: value });
  };

  useEffect(() => {
    if (!drag) return;
    const { mode, px, py, from } = drag;

    const onMove = (e: PointerEvent) => {
      const box = frame.current?.getBoundingClientRect();
      if (!box) return;
      const dxPct = ((e.clientX - px) / box.width) * 100;
      const dyPct = ((e.clientY - py) / box.height) * 100;

      if (mode === "image") {
        onChange({ ...from, x: from.x + dxPct, y: from.y + dyPct });
        return;
      }

      // Reshaping the frame: widening lowers the ratio's height share.
      let ratio = from.ratio;
      if (mode === "e" || mode === "se") {
        ratio = from.ratio * (1 + dxPct / 100);
      }
      if (mode === "s" || mode === "se") {
        ratio = ratio / (1 + dyPct / 100);
      }
      onChange({ ...from, ratio: Math.max(0.3, Math.min(8, ratio)) });
    };

    const onUp = () => setDrag(null);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [drag, onChange]);

  /**
   * Scroll to resize the artwork, anchored on the pointer.
   *
   * Attached by hand because React registers wheel listeners as passive, where
   * preventDefault is ignored — the page would scroll away underneath while
   * the poster zoomed.
   */
  useEffect(() => {
    const el = frame.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const box = el.getBoundingClientRect();

      const factor = e.deltaY < 0 ? 1.06 : 1 / 1.06;
      const next = Math.max(0.05, Math.min(8, value.scale * factor));

      // Keep whatever is under the cursor where it is.
      const cx = ((e.clientX - box.left) / box.width) * 100;
      const cy = ((e.clientY - box.top) / box.height) * 100;
      const k = next / value.scale;

      onChange({
        ...value,
        scale: next,
        x: cx - (cx - value.x) * k,
        y: cy - (cy - value.y) * k,
      });
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [value, onChange]);

  const handle =
    "absolute bg-white border border-ink-900 shadow-sm";

  return (
    <div className="relative pb-5 pr-5">
      <div
        ref={frame}
        onPointerDown={begin("image")}
        style={{ touchAction: "none" }}
        className={`relative select-none ring-1 ring-line ${
          drag?.mode === "image" ? "cursor-grabbing" : "cursor-grab"
        }`}
      >
        <PosterFrame src={src} layout={value}>
          {/* Thirds guides while arranging. */}
          {drag && (
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute inset-y-0 left-1/3 w-px bg-white/50" />
              <div className="absolute inset-y-0 left-2/3 w-px bg-white/50" />
              <div className="absolute inset-x-0 top-1/3 h-px bg-white/50" />
              <div className="absolute inset-x-0 top-2/3 h-px bg-white/50" />
            </div>
          )}
          {/* Measures the artwork so "fill" and "fit" can be worked out. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt=""
            className="pointer-events-none invisible absolute h-0 w-0"
            onLoad={(e) =>
              onImage?.(e.currentTarget.naturalWidth / e.currentTarget.naturalHeight)
            }
          />
        </PosterFrame>
      </div>

      {/* Frame handles sit outside the picture so they never fight with
          dragging the artwork. */}
      <span
        onPointerDown={begin("e")}
        title="Drag to widen or narrow the space"
        className={`${handle} right-3 top-1/2 h-10 w-2 -translate-y-1/2 cursor-ew-resize rounded-sm`}
      />
      <span
        onPointerDown={begin("s")}
        title="Drag to make the space taller or shorter"
        className={`${handle} bottom-3 left-1/2 h-2 w-10 -translate-x-1/2 cursor-ns-resize rounded-sm`}
      />
      <span
        onPointerDown={begin("se")}
        title="Drag to resize the space"
        className={`${handle} bottom-2.5 right-2.5 h-3.5 w-3.5 cursor-nwse-resize rounded-sm`}
      />
    </div>
  );
}
