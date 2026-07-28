/**
 * Incremental scanner pulling finished objects out of a JSON array while the
 * model is still writing it (PLAN.md STEP U4).
 *
 * Waiting for the closing bracket means waiting for the whole answer; instead
 * this tracks brace depth and string state, and hands back each object inside
 * the array the moment it closes. Which array that is — the `content` of a
 * document, or the bare list of edit operations — is the locator's business,
 * so a new answer shape is a new locator rather than a second scanner.
 *
 * Pure text in, raw JSON text out — parsing and schema validation stay with the
 * caller, so a single bad item never kills the stream.
 */

/** Decides which array the scanner should stream the objects of. */
export interface ArrayLocator {
  /**
   * Fed every structural character before the array is found, with the brace
   * depth and the last string literal read. True on the `[` that opens it.
   */
  opens(char: string, depth: number, literal: string): boolean;
}

/**
 * The `content` array of the root object — how a whole document is answered.
 * The key must belong to the root object; `content` keys nested inside blocks
 * sit deeper and must not be mistaken for it.
 */
export function rootContentArray(): ArrayLocator {
  let expecting = false;
  return {
    opens(char, depth, literal) {
      if (char === ":" && depth === 1 && literal === "content") {
        expecting = true;
        return false;
      }
      if (char !== "[") return false;
      const wanted = expecting;
      expecting = false;
      return wanted;
    },
  };
}

/** The first array to open — how a list of edit operations is answered. */
export function firstArray(): ArrayLocator {
  return { opens: (char) => char === "[" };
}

export class JsonArrayScanner {
  private buffer = "";
  private index = 0;
  /** Brace depth of the text read so far, until the array is found. */
  private depth = 0;
  private inString = false;
  private escaped = false;
  /** Raw text of the string literal currently being read (phase 1 only). */
  private literal = "";
  private inArray = false;
  /** Start offset of the object being read, or -1 between objects. */
  private itemStart = -1;
  private itemDepth = 0;
  private closed = false;

  constructor(private readonly locator: ArrayLocator) {}

  /** True once the array has ended — nothing more will come. */
  get finished(): boolean {
    return this.closed;
  }

  /** Feed the next chunk; returns the raw JSON of every object it completed. */
  push(chunk: string): string[] {
    this.buffer += chunk;
    const items: string[] = [];

    while (this.index < this.buffer.length && !this.closed) {
      const char = this.buffer[this.index];
      this.index++;

      if (this.inString) {
        this.readString(char);
        continue;
      }
      if (char === '"') {
        this.inString = true;
        this.literal = "";
        continue;
      }

      if (this.inArray) this.readItem(char, items);
      else this.findArray(char);
    }

    return items;
  }

  private readString(char: string): void {
    if (this.escaped) this.escaped = false;
    else if (char === "\\") this.escaped = true;
    else if (char === '"') this.inString = false;
    else if (!this.inArray) this.literal += char;
  }

  /** Phase 1 — locate the array whose objects are wanted. */
  private findArray(char: string): void {
    if (char === "{") this.depth++;
    else if (char === "}") this.depth--;
    if (this.locator.opens(char, this.depth, this.literal)) this.inArray = true;
  }

  /** Phase 2 — collect one complete object of that array. */
  private readItem(char: string, items: string[]): void {
    if (this.itemStart === -1) {
      if (char === "{") {
        this.itemStart = this.index - 1;
        this.itemDepth = 1;
      } else if (char === "]") {
        this.closed = true;
      }
      return;
    }
    if (char === "{") this.itemDepth++;
    else if (char === "}") {
      this.itemDepth--;
      if (this.itemDepth === 0) {
        items.push(this.buffer.slice(this.itemStart, this.index));
        this.itemStart = -1;
      }
    }
  }
}
