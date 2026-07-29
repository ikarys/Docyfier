import type { DiagramAttrs, DiagramKind } from "../diagram";
import type { Placement } from "./geometry";
import { lanes } from "./lanes";
import { layered } from "./layered";
import { timeline } from "./timeline";
import { tree } from "./tree";

/**
 * Turn a declared diagram into a drawing.
 *
 * One entry point, one algorithm per kind — the AI and the user never choose a
 * coordinate, so a diagram cannot be dragged into a mess and cannot arrive from
 * a model with boxes on top of each other.
 */

const LAYOUTS: Record<DiagramKind, (attrs: DiagramAttrs) => Placement> = {
  flow: layered,
  architecture: layered,
  hierarchy: tree,
  sequence: lanes,
  timeline,
};

export function placeNodes(attrs: DiagramAttrs): Placement {
  return LAYOUTS[attrs.kind](attrs);
}
