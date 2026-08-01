import type { DiagramAttrs, DiagramKind } from "../diagram";
import type { Placement } from "./geometry";
import { lanes } from "./lanes";
import { layered } from "./layered";
import { withMovedBoxes } from "./moved";
import { timeline } from "./timeline";
import { tree } from "./tree";

/**
 * Turn a declared diagram into a drawing.
 *
 * One entry point, one algorithm per kind — a model never chooses a coordinate,
 * so a diagram cannot arrive with boxes on top of each other. A person may,
 * afterwards, by dragging one: `moved.ts` lays those places over the computed
 * drawing, and `realign` gives it back.
 *
 * Everything that draws a diagram — the editor, the export, whatever library is
 * mounted to edit one — reads a `Placement` and nothing else. That is the seam:
 * a surface consumes this type and calls the edits in `diagram-edits.ts`, so
 * swapping the library that draws costs one adapter and no domain change.
 */

const LAYOUTS: Record<DiagramKind, (attrs: DiagramAttrs) => Placement> = {
  flow: layered,
  architecture: layered,
  hierarchy: tree,
  sequence: lanes,
  timeline,
};

export function placeNodes(attrs: DiagramAttrs): Placement {
  return withMovedBoxes(attrs, LAYOUTS[attrs.kind](attrs));
}
