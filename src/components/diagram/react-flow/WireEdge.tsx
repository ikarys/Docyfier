"use client";

import { EdgeLabelRenderer, type EdgeProps } from "@xyflow/react";
import { routeBetween } from "@/domain/documents/diagram/layout/edges";
import type { Point } from "@/domain/documents/diagram/layout/geometry";
import { arrowheadPath, polyline } from "@/domain/documents/diagram/scene";
import type { WireData } from "./placement-to-flow";

/**
 * An arrow, drawn from the route the layout computed — lanes, detours and all.
 *
 * While a box is under the cursor that route is stale: React Flow reports where
 * the line now leaves and lands, and no placement exists for a position nobody
 * has committed yet. So the ends are compared, and a line whose ends have moved
 * is redrawn by the same rule the layout uses. On drop the placement is computed
 * again and the full route comes back.
 */
export function WireEdge({ sourceX, sourceY, targetX, targetY, data }: EdgeProps) {
  const wire = data as unknown as WireData;
  const start = { x: sourceX, y: sourceY };
  const end = { x: targetX, y: targetY };
  const points = ends(wire.points, start, end)
    ? wire.points
    : routeBetween(start, end, wire.direction);
  const at = points[Math.floor(points.length / 2)];

  return (
    <>
      <path
        className="diagram-wire"
        d={polyline(points)}
        strokeDasharray={wire.dashed ? "5 4" : undefined}
      />
      {wire.head === "arrow" && <path className="diagram-wire-head" d={arrowheadPath(points)} />}
      {wire.label && (
        <EdgeLabelRenderer>
          <span
            className="diagram-wire-label nodrag nopan"
            style={{ transform: `translate(-50%, -50%) translate(${at.x}px, ${at.y}px)` }}
          >
            {wire.label}
          </span>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

/** Whether the route still starts and ends where the surface says it does. */
function ends(points: Point[], start: Point, end: Point): boolean {
  const same = (a: Point, b: Point): boolean =>
    Math.abs(a.x - b.x) < 0.5 && Math.abs(a.y - b.y) < 0.5;
  return points.length >= 2 && same(points[0], start) && same(points[points.length - 1], end);
}
