import type { Surface } from "./routing";

/**
 * Whether a surface asked for "turn into a diagram" specifically — the one
 * block action `passage/route.ts` hands a deterministic ascii-parse
 * skeleton to, instead of asking the model to both read a drawing and decide
 * its style in one call (PLAN.md STEP 10).
 *
 * Named apart from `routeSurface`: that decides which assistant answers, this
 * decides whether the parser runs first. The two questions can change for
 * independent reasons.
 */
export function wantsAsciiDiagramSkeleton(surface: Surface | undefined): boolean {
  return surface?.kind === "block-action" && surface.actionId === "into-diagram";
}
