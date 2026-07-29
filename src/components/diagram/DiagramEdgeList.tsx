"use client";

import { EDGE_STYLES, type DiagramAttrs, type EdgeStyle } from "@/domain/documents/diagram/diagram";
import {
  removeEdge,
  setEdgeLabel,
  setEdgeStyle,
} from "@/domain/documents/diagram/diagram-edits";

/**
 * One row per arrow. A timeline has none — its order is the order of its
 * boxes — so the list is not offered there.
 */
export function DiagramEdgeList({
  attrs,
  update,
}: {
  attrs: DiagramAttrs;
  update: (attrs: Partial<DiagramAttrs>) => void;
}) {
  const labelOf = (id: string) => attrs.nodes.find((n) => n.id === id)?.label ?? id;

  return (
    <ul className="diagram-rows">
      {attrs.edges.map((edge, index) => (
        <li key={`${edge.from}-${edge.to}-${index}`} className="diagram-panel-row">
          <span className="diagram-ends">
            {labelOf(edge.from)} → {labelOf(edge.to)}
          </span>
          <input
            className="diagram-input"
            placeholder="Label"
            value={edge.label ?? ""}
            onChange={(e) => update(setEdgeLabel(attrs, index, e.target.value))}
            aria-label={`Label of the arrow from ${labelOf(edge.from)} to ${labelOf(edge.to)}`}
          />
          <select
            className="tb-select"
            value={edge.style}
            onChange={(e) => update(setEdgeStyle(attrs, index, e.target.value as EdgeStyle))}
            aria-label={`Line of the arrow from ${labelOf(edge.from)} to ${labelOf(edge.to)}`}
          >
            {EDGE_STYLES.map((style) => (
              <option key={style} value={style}>
                {style === "solid" ? "Solid" : "Dashed"}
              </option>
            ))}
          </select>
          <button className="tb-btn" onClick={() => update(removeEdge(attrs, index))} title="Remove">
            −
          </button>
        </li>
      ))}
    </ul>
  );
}
