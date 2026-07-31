/**
 * How much of the block vocabulary one surface is shown.
 *
 * The format contract is the largest thing every AI call carries, and most
 * calls are told about blocks they are forbidden to produce: a paragraph being
 * shortened does not need the syntax of a diagram, and the writer is explicitly
 * barred from emitting one. Sizing the contract to the surface is therefore not
 * only cheaper, it is the charter enforced by omission — a vocabulary the model
 * was never given is one it cannot misuse.
 */
export type ContractScope =
  /** Everything, including the blocks that only exist at document level. */
  | "document"
  /** A passage, by an assistant allowed to present it: no cover, no ToC. */
  | "layout"
  /** A passage, by an assistant that owns only the words. */
  | "prose";

/** True when this scope may produce the blocks that present content. */
export function showsLayoutBlocks(scope: ContractScope): boolean {
  return scope !== "prose";
}

/** True when this scope may produce blocks that only make sense once per document. */
export function showsDocumentBlocks(scope: ContractScope): boolean {
  return scope === "document";
}
