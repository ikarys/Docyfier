/**
 * Finding a string in a document (PLAN.md STEP U8).
 *
 * The rule is stated over text alone: a block is its text and the position that
 * text starts at, which is all a caller needs to map a match back to wherever
 * the text came from. Searching a paragraph and searching a table cell are the
 * same question, so they have one answer here rather than one per surface.
 */

/** One run of searchable text, and where it begins in the document. */
export interface SearchableBlock {
  readonly text: string;
  readonly from: number;
}

/** A found occurrence, in the same coordinates the blocks were given in. */
export interface TextMatch {
  readonly from: number;
  readonly to: number;
}

export interface SearchOptions {
  readonly caseSensitive?: boolean;
  /** Only match occurrences standing alone: "form" spares "format". */
  readonly wholeWord?: boolean;
}

const WORD_CHARACTER = /[\p{L}\p{N}_]/u;

const isWordCharacter = (character: string | undefined): boolean =>
  character !== undefined && WORD_CHARACTER.test(character);

/**
 * Every occurrence of `query`, in reading order. A match never spans two
 * blocks: what a paragraph break separates, a search does not join.
 */
export function findMatches(
  blocks: readonly SearchableBlock[],
  query: string,
  options: SearchOptions = {},
): TextMatch[] {
  if (query.trim() === "") return [];

  const needle = options.caseSensitive ? query : query.toLowerCase();
  const matches: TextMatch[] = [];

  for (const block of blocks) {
    const haystack = options.caseSensitive ? block.text : block.text.toLowerCase();
    // Scanning forward from the end of the previous hit is what keeps matches
    // from overlapping: "aa" in "aaaa" is two occurrences, not three.
    let at = haystack.indexOf(needle);
    while (at !== -1) {
      const end = at + needle.length;
      if (!options.wholeWord || standsAlone(haystack, at, end)) {
        matches.push({ from: block.from + at, to: block.from + end });
      }
      at = haystack.indexOf(needle, options.wholeWord ? at + 1 : end);
    }
  }

  return matches;
}

function standsAlone(haystack: string, at: number, end: number): boolean {
  return !isWordCharacter(haystack[at - 1]) && !isWordCharacter(haystack[end]);
}
