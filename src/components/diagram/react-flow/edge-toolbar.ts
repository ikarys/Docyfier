import type { DiagramAttrs } from "@/domain/documents/diagram/diagram";
import { removeEdge } from "@/domain/documents/diagram/diagram-edits";
import { wireIndexOf } from "./placement-to-flow";

/**
 * What the bar over a selected arrow may do, decided outside the DOM.
 *
 * Mirrors `box-toolbar.ts`: the deletion is offered only when it would take —
 * a sequence's last message, refused by `removeEdge` handing the diagram back
 * untouched — and a button that quietly does nothing is worse than no button.
 */
export interface EdgeToolbar {
  /** The position in `edges` the surface's id stands for. */
  index: number;
  dashed: boolean;
  removable: boolean;
}

export function toolbarFor(attrs: DiagramAttrs, flowId: string): EdgeToolbar | null {
  const index = wireIndexOf(flowId);
  if (index === null) return null;
  const edge = attrs.edges[index];
  if (!edge) return null;
  return {
    index,
    dashed: edge.style === "dashed",
    removable: removeEdge(attrs, index) !== attrs,
  };
}
