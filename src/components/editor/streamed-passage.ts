/**
 * Where a streamed answer sits in the document while it is still arriving.
 *
 * A passage edit lands in instalments: the first block replaces the passage,
 * every later one goes after what has already landed, and the whole thing has
 * to be undoable as one range when the stream ends badly. That is three pieces
 * of arithmetic on positions that move under it, which is exactly the kind of
 * bookkeeping a component hides until it is wrong — so it lives here, where a
 * test can drive it without an editor.
 *
 * Growth is measured from the document's own size rather than from the block
 * that was inserted: only the editor knows what a node became once its schema
 * had a say.
 */

export interface Range {
  readonly from: number;
  readonly to: number;
}

export class StreamedPassage {
  private readonly from: number;
  private to: number;
  private landed = 0;

  constructor(passage: Range) {
    this.from = passage.from;
    this.to = passage.to;
  }

  /** Where the next block goes: over the passage, then after the answer. */
  get target(): Range {
    return this.landed === 0 ? { from: this.from, to: this.to } : { from: this.to, to: this.to };
  }

  /** Record what the document grew by once that block was in. */
  grewBy(delta: number): void {
    this.to += delta;
    this.landed++;
  }

  /** True once something of the answer is in the document. */
  get started(): boolean {
    return this.landed > 0;
  }

  /** Everything the answer occupies — what Reject, or a failure, takes back. */
  get written(): Range {
    return { from: this.from, to: this.to };
  }
}
