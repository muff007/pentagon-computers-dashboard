"use client";

import type { PosterLayout } from "@/lib/types";

/**
 * Draws a poster exactly as arranged: a frame of the chosen shape, with the
 * artwork positioned and scaled inside it.
 *
 * This is the single definition of what an arrangement means. The editor, the
 * preview and the storefront all render through the same rules, which is the
 * only way a preview can be trusted.
 */
export default function PosterFrame({
  src,
  layout,
  className = "",
  children,
}: {
  src: string;
  layout: PosterLayout;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={`relative w-full overflow-hidden ${className}`}
      style={{ aspectRatio: String(layout.ratio), background: layout.bg }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        draggable={false}
        className="absolute max-w-none select-none"
        style={{
          width: `${layout.scale * 100}%`,
          left: `${layout.x}%`,
          top: `${layout.y}%`,
        }}
      />
      {children}
    </div>
  );
}
