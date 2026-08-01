"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { BoxData } from "./placement-to-flow";

/**
 * A box, in HTML rather than in SVG.
 *
 * Its size and place come from the placement, so it stands exactly where the
 * exported drawing puts it; what it paints comes from the same theme tokens the
 * SVG reads, so a document that changes theme changes this too. The handles are
 * on the axis the diagram flows along — an arrow drawn by dragging one leaves
 * and lands where the layout would have made it leave and land.
 */
export function BoxNode({ data, selected }: NodeProps) {
  const box = data as unknown as BoxData;
  const along = box.direction === "down";
  return (
    <div className="diagram-box" data-accent={box.accent ?? undefined} data-selected={selected}>
      <Handle type="target" position={along ? Position.Top : Position.Left} />
      <span className="diagram-box-label">
        {box.lines.map((line, i) => (
          <span key={i}>{line}</span>
        ))}
      </span>
      {box.note && <span className="diagram-box-note">{box.note}</span>}
      <Handle type="source" position={along ? Position.Bottom : Position.Right} />
    </div>
  );
}
