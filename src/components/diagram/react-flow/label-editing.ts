import type { DiagramAttrs } from "@/domain/documents/diagram/diagram";
import {
  renameGroup,
  renameNode,
  setEdgeLabel,
  setNote,
} from "@/domain/documents/diagram/diagram-edits";

/**
 * What a piece of text on the drawing is, and what typing over it means.
 *
 * The canvas knows only that something was double-clicked; which edit that
 * stands for is decided here. Kept out of the components on purpose: this is
 * the rule, and a rule that lives in a node view can only be tested with a
 * browser around it.
 */

export type EditingTarget =
  | { of: "label"; id: string }
  | { of: "note"; id: string }
  | { of: "band"; id: string }
  | { of: "wire"; index: number };

export function textOf(attrs: DiagramAttrs, target: EditingTarget): string {
  if (target.of === "wire") return attrs.edges[target.index]?.label ?? "";
  if (target.of === "band") return attrs.groups.find((g) => g.id === target.id)?.label ?? "";
  const node = attrs.nodes.find((n) => n.id === target.id);
  return (target.of === "label" ? node?.label : node?.note) ?? "";
}

/**
 * The diagram after typing `text` over `target` — or null when there is nothing
 * to write, either because the text came back unchanged or because the edit
 * would leave a diagram nobody can draw.
 *
 * Null rather than the diagram itself: the caller updates a document, and an
 * update for a document nobody changed is a write, a version and a diff.
 */
export function commitLabel(
  attrs: DiagramAttrs,
  target: EditingTarget,
  text: string,
): DiagramAttrs | null {
  if (text === textOf(attrs, target)) return null;
  const next = edited(attrs, target, text);
  return next === attrs ? null : next;
}

function edited(attrs: DiagramAttrs, target: EditingTarget, text: string): DiagramAttrs {
  switch (target.of) {
    case "label":
      return renameNode(attrs, target.id, text);
    case "note":
      return setNote(attrs, target.id, text);
    case "band":
      return renameGroup(attrs, target.id, text);
    case "wire":
      return setEdgeLabel(attrs, target.index, text);
  }
}
