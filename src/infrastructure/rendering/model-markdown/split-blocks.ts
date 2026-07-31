import { FENCE } from "./directives";

/**
 * Where one block ends and the next begins.
 *
 * A blank line separates two blocks — except inside something that is allowed
 * to hold one: a code fence, a maths fence, a directive. Lists never contain a
 * blank line by construction (see `emit-lists.ts`) and a blockquote marks every
 * line of its own, so those two need no rule here.
 *
 * One state machine, two ways in: `splitBlocks` for an answer that has arrived,
 * a `BlockSplitter` for one still being written. The streamed reading is the
 * reason it is a line-at-a-time scanner rather than a regex, and the reason the
 * rule has a single home — a stream that split differently from a finished text
 * would be a bug nobody could see until a document was already half inserted.
 */

const CODE_FENCE = /^(`{3,})/;
const MATH_FENCE = "$$";
const DIRECTIVE_OPEN = new RegExp(`^${FENCE} \\S`);

export class BlockSplitter {
  /** The line still being written, up to the next newline. */
  private pending = "";
  private current: string[] = [];
  private code = 0;
  private math = false;
  private directives = 0;

  /** The blocks the chunk completed. Whatever it started waits for the rest. */
  push(chunk: string): string[] {
    const lines = (this.pending + chunk).split("\n");
    this.pending = lines.pop() ?? "";
    const blocks: string[] = [];
    for (const line of lines) this.take(line, blocks);
    return blocks;
  }

  /** What is left when the model stops writing, closed where it stands. */
  end(): string[] {
    const blocks: string[] = [];
    if (this.pending) {
      this.take(this.pending, blocks);
      this.pending = "";
    }
    const last = this.close();
    if (last) blocks.push(last);
    return blocks;
  }

  private get inside(): boolean {
    return this.code > 0 || this.math || this.directives > 0;
  }

  private take(line: string, blocks: string[]): void {
    if (!line.trim() && !this.inside) {
      const block = this.close();
      if (block) blocks.push(block);
      return;
    }
    const wasInside = this.inside;
    this.advance(line);
    this.current.push(line);
    // A fence that just closed cannot be continued: the block is whole, and
    // waiting for the blank line after it would be a wait for nothing.
    if (!wasInside || this.inside) return;
    const block = this.close();
    if (block) blocks.push(block);
  }

  private close(): string | null {
    const block = this.current.join("\n").trim();
    this.current = [];
    return block || null;
  }

  private advance(line: string): void {
    if (this.code) {
      const closing = CODE_FENCE.exec(line);
      if (closing && closing[1].length >= this.code && line.trim() === closing[1]) this.code = 0;
      return;
    }
    if (this.math) {
      if (line.trim() === MATH_FENCE) this.math = false;
      return;
    }
    const opening = CODE_FENCE.exec(line);
    if (opening) {
      this.code = opening[1].length;
      return;
    }
    if (line.trim() === MATH_FENCE) {
      this.math = true;
      return;
    }
    if (DIRECTIVE_OPEN.test(line)) this.directives++;
    else if (line.trim() === FENCE && this.directives > 0) this.directives--;
  }
}

/** The text as its top-level blocks, each still in the format it arrived in. */
export function splitBlocks(text: string): string[] {
  const splitter = new BlockSplitter();
  return [...splitter.push(text), ...splitter.end()];
}
