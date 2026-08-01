"use client";

import type { NodeProps } from "@xyflow/react";
import type { BandData } from "./placement-to-flow";

/**
 * The band behind a group's boxes, with its name in the strip above it — the
 * same two shapes `scene.ts` paints. It is drawn, never touched: a group is
 * moved by moving what belongs to it.
 */
export function BandNode({ data }: NodeProps) {
  return (
    <div className="diagram-band">
      <span className="diagram-band-label">{(data as unknown as BandData).label}</span>
    </div>
  );
}
