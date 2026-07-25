/**
 * Incremental scanner pulling finished top-level blocks out of a document JSON
 * response while the model is still writing it (PLAN.md STEP U4).
 *
 * The model streams one `{"type":"doc","content":[ ... ]}` object. Waiting for
 * the closing brace means waiting for the whole document; instead this tracks
 * brace depth and string state, and hands back each object inside the root
 * `content` array the moment it closes.
 *
 * Pure text in, raw JSON text out — parsing and schema validation stay with the
 * caller, so a single bad block never kills the stream.
 */
export class BlockScanner {
  private buffer = "";
  private index = 0;
  /** Brace depth of the root object, until the content array is found. */
  private depth = 0;
  private inString = false;
  private escaped = false;
  /** Raw text of the string literal currently being read (phase 1 only). */
  private literal = "";
  /** A `"content"` key was just read at the root, awaiting its `[`. */
  private expectingArray = false;
  private inArray = false;
  /** Start offset of the block being read, or -1 between blocks. */
  private blockStart = -1;
  private blockDepth = 0;
  private closed = false;

  /** True once the root content array has ended — nothing more will come. */
  get finished(): boolean {
    return this.closed;
  }

  /** Feed the next chunk; returns the raw JSON of every block it completed. */
  push(chunk: string): string[] {
    this.buffer += chunk;
    const blocks: string[] = [];

    while (this.index < this.buffer.length && !this.closed) {
      const char = this.buffer[this.index];
      this.index++;

      if (this.inString) {
        if (this.escaped) this.escaped = false;
        else if (char === "\\") this.escaped = true;
        else if (char === '"') this.inString = false;
        else if (!this.inArray) this.literal += char;
        continue;
      }
      if (char === '"') {
        this.inString = true;
        this.literal = "";
        continue;
      }

      if (this.inArray) this.readBlock(char, blocks);
      else this.findArray(char);
    }

    return blocks;
  }

  /** Phase 1 — locate the root object's `content` array. */
  private findArray(char: string): void {
    if (char === "{") {
      this.depth++;
      return;
    }
    if (char === "}") {
      this.depth--;
      return;
    }
    // The key must belong to the root object; `content` keys nested inside
    // blocks sit deeper and must not be mistaken for it.
    if (char === ":" && this.depth === 1 && this.literal === "content") {
      this.expectingArray = true;
      return;
    }
    if (char === "[" && this.expectingArray) {
      this.expectingArray = false;
      this.inArray = true;
    }
  }

  /** Phase 2 — collect one complete object of the content array. */
  private readBlock(char: string, blocks: string[]): void {
    if (this.blockStart === -1) {
      if (char === "{") {
        this.blockStart = this.index - 1;
        this.blockDepth = 1;
      } else if (char === "]") {
        this.closed = true;
      }
      return;
    }
    if (char === "{") this.blockDepth++;
    else if (char === "}") {
      this.blockDepth--;
      if (this.blockDepth === 0) {
        blocks.push(this.buffer.slice(this.blockStart, this.index));
        this.blockStart = -1;
      }
    }
  }
}
