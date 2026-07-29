"use client";

import type { DiagramAttrs } from "@/domain/documents/diagram/diagram";
import { placeNodes } from "@/domain/documents/diagram/layout/place";
import { toScene, type Ink, type Shape } from "@/domain/documents/diagram/scene";

/**
 * The browser half of the drawing pair.
 *
 * It paints the same scene the export path paints, and differs in one respect
 * only: colours stay theme tokens, so switching a document's theme restyles
 * every diagram with no content change — the bargain the charts already make.
 * The standalone emitter that writes literal colours lives in
 * `src/infrastructure/rendering/svg/scene-to-svg.ts`.
 */

function ink(name: Ink): string {
  return `var(--diagram-${name})`;
}

export function DiagramPlot({ attrs }: { attrs: DiagramAttrs }) {
  const scene = toScene(placeNodes(attrs));
  return (
    <svg
      className="diagram-svg"
      viewBox={`0 0 ${scene.width} ${scene.height}`}
      role="img"
      aria-label={attrs.title ?? `${attrs.kind} diagram`}
      preserveAspectRatio="xMidYMid meet"
    >
      {scene.shapes.map((shape, i) => (
        <Primitive key={i} shape={shape} />
      ))}
    </svg>
  );
}

function Primitive({ shape }: { shape: Shape }) {
  if (shape.shape === "rect") {
    return (
      <rect
        x={shape.x}
        y={shape.y}
        width={shape.width}
        height={shape.height}
        rx={shape.radius}
        fill={shape.fill ? ink(shape.fill) : "none"}
        stroke={shape.stroke ? ink(shape.stroke) : undefined}
        strokeDasharray={shape.dashed ? "5 4" : undefined}
      />
    );
  }
  if (shape.shape === "path") {
    return (
      <path
        d={shape.d}
        fill={shape.fill ? ink(shape.fill) : "none"}
        stroke={shape.stroke ? ink(shape.stroke) : undefined}
        strokeWidth={shape.stroke ? shape.width : undefined}
        strokeDasharray={shape.dashed ? "5 4" : undefined}
      />
    );
  }
  return (
    <text
      x={shape.x}
      y={shape.y}
      fontSize={shape.size}
      fontWeight={shape.bold ? 600 : undefined}
      textAnchor={shape.anchor}
      fill={ink(shape.fill)}
    >
      {shape.text}
    </text>
  );
}
