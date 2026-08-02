import { ACCENT_SLOTS, type DiagramAttrs } from "@/domain/documents/diagram/diagram";
import { removeNode } from "@/domain/documents/diagram/diagram-edits";
import { boxIdOf } from "./placement-to-flow";

/**
 * What the bar hovering over a selected box may do, decided outside the DOM.
 *
 * The colours are the ones the drawing already knows how to paint, and the
 * deletion is offered only when it would take: `removeNode` hands the diagram
 * back untouched when what is left could not be drawn — the last box of a flow,
 * the second participant of a sequence — and a button that quietly does nothing
 * is worse than a button that is not there.
 */

/** Plain first: the absence of a colour is a choice, not a missing option. */
export const ACCENT_CHOICES: readonly (number | null)[] = [
  null,
  ...Array.from({ length: ACCENT_SLOTS }, (_, i) => i + 1),
];

export interface BoxToolbar {
  /** The node the surface's id stands for. */
  id: string;
  accent: number | null;
  removable: boolean;
}

export function toolbarFor(attrs: DiagramAttrs, flowId: string): BoxToolbar | null {
  const id = boxIdOf(flowId);
  const node = id === null ? undefined : attrs.nodes.find((n) => n.id === id);
  if (!node) return null;
  return {
    id: node.id,
    accent: node.accent ?? null,
    removable: removeNode(attrs, node.id) !== attrs,
  };
}

/**
 * Whether this key means "remove the selected box".
 *
 * Backspace is safe to claim because the field opened over a label stops its
 * own keys (`InlineText`), so nothing typed into a word ever reaches here.
 */
export function removesBox(key: string): boolean {
  return key === "Delete" || key === "Backspace";
}
