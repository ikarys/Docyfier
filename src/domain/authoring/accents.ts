import type { DocumentNode } from "@/domain/documents/body";

/**
 * The colors a layout block wears when the model picked none.
 *
 * Every accented family renders grey without them: three cards side by side,
 * identical, is exactly the "correct but dull" output the style guide asks the
 * model to avoid and the model forgets to. Rotating a fixed cycle is a rule, so
 * it belongs here rather than in a prompt that may or may not be honoured.
 *
 * A single child with a real accent means the model did choose — the whole
 * block is then left exactly as it is, because a half-painted grid is worse
 * than a grey one.
 */

export const ACCENT_CYCLE = ["blue", "green", "purple", "yellow"] as const;

/** The child type each layout block accents. */
const ACCENTED_CHILD: Record<string, string> = {
  cardGrid: "card",
  statRow: "stat",
  timeline: "timelineItem",
  stepList: "step",
};

function isPainted(node: DocumentNode): boolean {
  const accent = node.attrs?.accent;
  return typeof accent === "string" && accent !== "none";
}

export function paintAccents(node: DocumentNode): DocumentNode {
  const childType = ACCENTED_CHILD[node.type ?? ""];
  const children = node.content ?? [];
  if (!childType || children.length === 0) return node;
  if (children.some(isPainted)) return node;

  return {
    ...node,
    content: children.map((child, i) =>
      child.type === childType
        ? {
            ...child,
            attrs: { ...child.attrs, accent: ACCENT_CYCLE[i % ACCENT_CYCLE.length] },
          }
        : child,
    ),
  };
}
