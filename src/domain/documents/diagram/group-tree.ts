import { MAX_GROUP_DEPTH, type DiagramGroup } from "./diagram";

/**
 * What "inside" means for a group (PLAN.md STEP 10).
 *
 * An architecture drawing is almost always nested — a subscription holds a
 * cluster, which holds an instance, which holds namespaces — and a flat list of
 * bands cannot say so. The tree those parents make is read here, once, because
 * three things need it and none of them may disagree: the validation that
 * refuses a cycle, the ranking that keeps a subtree together, and the geometry
 * that draws one band inside another.
 *
 * Every function here tolerates a broken tree rather than trusting one.
 * `validation.ts` is what refuses a diagram, and it cannot be the only thing
 * standing between a stored document and a layout that never returns.
 */

/** A parent nobody declared is no parent: the group stands at the top. */
function parentOf(groups: DiagramGroup[], id: string): string | null {
  const parent = groups.find((group) => group.id === id)?.parent;
  if (parent === undefined) return null;
  return groups.some((group) => group.id === parent) ? parent : null;
}

/** Every group above one, outermost first, ending with the group itself. */
export function groupPath(groups: DiagramGroup[], id: string): string[] {
  const path: string[] = [];
  const seen = new Set<string>();
  let at: string | null = id;
  while (at !== null && !seen.has(at)) {
    seen.add(at);
    path.unshift(at);
    at = parentOf(groups, at);
  }
  return path;
}

/** How many groups a group sits inside. Zero at the top. */
export function groupDepth(groups: DiagramGroup[], id: string): number {
  return groupPath(groups, id).length - 1;
}

/** The id of a group that contains itself, however far around, or null. */
export function groupCycle(groups: DiagramGroup[]): string | null {
  for (const group of groups) {
    const seen = new Set<string>();
    let at: string | null = group.id;
    while (at !== null) {
      if (seen.has(at)) return group.id;
      seen.add(at);
      at = parentOf(groups, at);
    }
  }
  return null;
}

/**
 * The groups in the order their bands must be drawn.
 *
 * A band is a filled rectangle, so one drawn before its own parent would be
 * buried by it. Sorting on depth is enough — a child is always deeper than the
 * group holding it — and it is stable, so siblings keep the order they were
 * declared in.
 */
export function outermostFirst(groups: DiagramGroup[]): DiagramGroup[] {
  return [...groups].sort(
    (one, other) => groupDepth(groups, one.id) - groupDepth(groups, other.id),
  );
}

/**
 * A number per group such that a whole subtree takes a run of consecutive ones.
 *
 * `ranking.ts` sorts each rank on it, and that is the only reason it exists: a
 * band drawn around scattered boxes says something false about the system, and
 * two branches interleaved would make every band a comb. Numbering depth first,
 * in the order the groups were declared, is what makes a subtree a run.
 */
export function groupOrder(groups: DiagramGroup[]): Map<string, number> {
  const order = new Map<string, number>();
  const walk = (parent: string | null): void => {
    for (const group of groups) {
      if ((parentOf(groups, group.id) ?? null) !== parent || order.has(group.id)) continue;
      order.set(group.id, order.size);
      walk(group.id);
    }
  };
  walk(null);
  // A ring reaches none of its groups from the top; they keep the order they
  // were declared in, which is as good as any and never leaves one unnumbered.
  for (const group of groups) {
    if (!order.has(group.id)) order.set(group.id, order.size);
  }
  return order;
}

/**
 * What a tree of groups may not be — the half of `diagramError` that is about
 * nesting rather than about one group being well formed.
 *
 * A ring has no outermost band, so the walk that measures one would not end;
 * every function above survives one, and this is what stops it being stored.
 * Depth is capped for a plainer reason: every level costs the drawing padding
 * on all four sides, so past a few the innermost boxes are a stripe.
 */
export function groupTreeError(groups: DiagramGroup[]): string | null {
  const declared = new Set(groups.map((group) => group.id));
  for (const group of groups) {
    if (group.parent !== undefined && !declared.has(group.parent)) {
      return `diagram group "${group.id}" sits inside group "${group.parent}", which is not declared`;
    }
  }

  const ringed = groupCycle(groups);
  if (ringed !== null) return `diagram group "${ringed}" contains itself`;

  const deepest = groups.find((group) => groupDepth(groups, group.id) > MAX_GROUP_DEPTH);
  return deepest
    ? `diagram group "${deepest.id}" is nested more than ${MAX_GROUP_DEPTH} deep`
    : null;
}
