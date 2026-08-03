"use client";

import { removeEdge, setEdgeStyle } from "@/domain/documents/diagram/diagram-edits";
import { toolbarFor } from "./edge-toolbar";
import { useEditing } from "./editing-context";

/**
 * The bar over the arrow under the hand: its line, and its way out.
 *
 * Mounted by `WireEdge` inside its own `EdgeLabelRenderer` block, so it
 * shares the plate's positioning rather than fighting React Flow for a place
 * on the drawing.
 */
export function EdgeToolbar({ flowId }: { flowId: string }) {
  const { attrs, update } = useEditing();
  const bar = toolbarFor(attrs, flowId);
  if (!bar) return null;

  return (
    <div className="diagram-bar diagram-edge-bar nodrag nopan">
      <button
        type="button"
        className="diagram-swatch"
        data-on={bar.dashed}
        aria-label={bar.dashed ? "Solid line" : "Dashed line"}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => update(setEdgeStyle(attrs, bar.index, bar.dashed ? "solid" : "dashed"))}
      >
        {bar.dashed ? "┄" : "─"}
      </button>
      {bar.removable && (
        <button
          type="button"
          className="diagram-bar-remove"
          aria-label="Delete arrow"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => update(removeEdge(attrs, bar.index))}
        >
          ✕
        </button>
      )}
    </div>
  );
}
