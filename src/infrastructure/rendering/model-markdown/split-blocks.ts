import { FENCE } from "./directives";

/**
 * Where one block ends and the next begins.
 *
 * A blank line separates two blocks — except inside something that is allowed
 * to hold one: a code fence, a maths fence, a directive. Lists never contain a
 * blank line by construction (see `emit-lists.ts`) and a blockquote marks every
 * line of its own, so those two need no rule here.
 *
 * The same scanner reads a finished answer and, later, one arriving token by
 * token, which is why it is a line-at-a-time state machine rather than a regex.
 */

const CODE_FENCE = /^(`{3,})/;
const MATH_FENCE = "$$";
const DIRECTIVE_OPEN = new RegExp(`^${FENCE} \\S`);

interface Depth {
  code: number;
  math: boolean;
  directives: number;
}

function emptyDepth(): Depth {
  return { code: 0, math: false, directives: 0 };
}

/** Whether the line leaves the scanner inside something a blank line cannot cut. */
function advance(line: string, depth: Depth): void {
  if (depth.code) {
    const closing = CODE_FENCE.exec(line);
    if (closing && closing[1].length >= depth.code && line.trim() === closing[1]) depth.code = 0;
    return;
  }
  if (depth.math) {
    if (line.trim() === MATH_FENCE) depth.math = false;
    return;
  }
  const opening = CODE_FENCE.exec(line);
  if (opening) {
    depth.code = opening[1].length;
    return;
  }
  if (line.trim() === MATH_FENCE) {
    depth.math = true;
    return;
  }
  if (DIRECTIVE_OPEN.test(line)) depth.directives++;
  else if (line.trim() === FENCE && depth.directives > 0) depth.directives--;
}

const inside = (depth: Depth): boolean => depth.code > 0 || depth.math || depth.directives > 0;

/** The text as its top-level blocks, each still in the format it arrived in. */
export function splitBlocks(text: string): string[] {
  const depth = emptyDepth();
  const blocks: string[] = [];
  let current: string[] = [];

  const close = () => {
    const block = current.join("\n").trim();
    if (block) blocks.push(block);
    current = [];
  };

  for (const line of text.split("\n")) {
    if (!line.trim() && !inside(depth)) {
      close();
      continue;
    }
    advance(line, depth);
    current.push(line);
  }
  close();
  return blocks;
}
