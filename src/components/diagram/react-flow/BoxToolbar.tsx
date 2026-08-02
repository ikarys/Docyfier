"use client";

import { NodeToolbar, Position } from "@xyflow/react";
import { removeNode, setAccent } from "@/domain/documents/diagram/diagram-edits";
import { ACCENT_CHOICES, toolbarFor } from "./box-toolbar";
import { useEditing } from "./editing-context";

/**
 * The bar over the box under the hand: its colour, and its way out.
 *
 * `NodeToolbar` rather than a floating element of our own, because the drawing
 * is scaled to the text column and a bar positioned in page pixels would drift
 * away from the box it belongs to at every width. What it offers is decided in
 * `box-toolbar.ts`; nothing here knows a rule.
 */
export function BoxToolbar({ flowId }: { flowId: string }) {
  const { attrs, update } = useEditing();
  const bar = toolbarFor(attrs, flowId);
  if (!bar) return null;

  return (
    <NodeToolbar position={Position.Top} offset={10} className="diagram-bar nodrag nopan">
      {ACCENT_CHOICES.map((slot) => (
        <button
          key={slot ?? "plain"}
          type="button"
          className="diagram-swatch"
          data-accent={slot ?? undefined}
          data-on={bar.accent === slot}
          aria-label={slot === null ? "No colour" : `Colour ${slot}`}
          // The box must keep the selection the bar is drawn for.
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => update(setAccent(attrs, bar.id, slot))}
        />
      ))}
      {bar.removable && (
        <button
          type="button"
          className="diagram-bar-remove"
          aria-label="Delete box"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => update(removeNode(attrs, bar.id))}
        >
          ✕
        </button>
      )}
    </NodeToolbar>
  );
}
