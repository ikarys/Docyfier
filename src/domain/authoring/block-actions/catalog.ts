import type { BlockAction } from "./contract";
import { expand, rewrite, shorten } from "./rewrite";
import { intoChart, intoStats, intoSteps, intoTable } from "./turn-into";

/**
 * Every action the drag handle offers on one block.
 *
 * A new action is a line in a family file and a line here: the menu draws this
 * list, and the surface that runs it reads the instruction from the action
 * rather than holding one of its own.
 */
export const BLOCK_ACTIONS: readonly BlockAction[] = [
  rewrite,
  shorten,
  expand,
  intoTable,
  intoSteps,
  intoStats,
  intoChart,
];

export function findBlockAction(id: string): BlockAction | undefined {
  return BLOCK_ACTIONS.find((action) => action.id === id);
}

/** The actions of one family, in catalog order — how the menu is grouped. */
export function blockActionsOf(family: BlockAction["family"]): BlockAction[] {
  return BLOCK_ACTIONS.filter((action) => action.family === family);
}
