"use client";

import type { NodeProps } from "@xyflow/react";
import { InlineText } from "./InlineText";
import { groupIdOf, type BandData } from "./placement-to-flow";

/**
 * The band behind a group's boxes, with its name in the strip above it — the
 * same two shapes `scene.ts` paints. The band itself is drawn, never touched: a
 * group is moved by moving what belongs to it. Its name is the exception, and
 * it is edited where it is read.
 */
export function BandNode({ id, data }: NodeProps) {
  const group = groupIdOf(id) ?? id;
  return (
    <div className="diagram-band">
      <InlineText
        target={{ of: "band", id: group }}
        value={(data as unknown as BandData).label}
        className="diagram-band-label"
      />
    </div>
  );
}
