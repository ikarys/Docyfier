/**
 * What the AI can be asked to do to one block (PLAN.md STEP U11).
 *
 * An action is an instruction and the words the menu shows for it — data, not
 * behaviour, because every one of them goes through the same use case: the
 * block in, its replacement blocks out, one op on one index. A new action is a
 * line in a family file and a line in the catalog.
 */
export interface BlockAction {
  readonly id: string;
  /** What the menu shows. */
  readonly label: string;
  /** Actions of the same family are drawn together, in catalog order. */
  readonly family: "rewrite" | "turn-into";
  /** What the model is told to do with the block it is given. */
  readonly instruction: string;
}
