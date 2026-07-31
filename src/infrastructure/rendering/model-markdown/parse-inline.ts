import type { DocumentMark, DocumentNode } from "@/domain/documents/body";

/**
 * Inline content on the way back from a model — the inverse of
 * `inline-marks.ts`, and the only place that reads a delimiter.
 *
 * It is a left-to-right scanner rather than a set of regexes because the
 * backslash escape has to be honoured while looking for a closing delimiter: a
 * `\*` inside a bold run is a star, not the end of it. Anything that does not
 * close is text, which is what a reader would assume too.
 */

interface Wrapper {
  readonly open: RegExp;
  readonly close: string;
  readonly marks: (match: RegExpExecArray) => DocumentMark[];
}

/** Longest opener first: `***` before `**`, `**` before `*`. */
const WRAPPERS: readonly Wrapper[] = [
  { open: /^\*\*\*/, close: "***", marks: () => [{ type: "bold" }, { type: "italic" }] },
  { open: /^\*\*/, close: "**", marks: () => [{ type: "bold" }] },
  { open: /^~~/, close: "~~", marks: () => [{ type: "strike" }] },
  { open: /^<u>/, close: "</u>", marks: () => [{ type: "underline" }] },
  { open: /^<sub>/, close: "</sub>", marks: () => [{ type: "subscript" }] },
  { open: /^<sup>/, close: "</sup>", marks: () => [{ type: "superscript" }] },
  {
    open: /^<mark(?: style="background-color:([^"]*)")?>/,
    close: "</mark>",
    marks: (match) => [match[1] ? { type: "highlight", attrs: { color: match[1] } } : { type: "highlight" }],
  },
  {
    open: /^<span style="color:([^"]*)">/,
    close: "</span>",
    marks: (match) => [{ type: "textStyle", attrs: { color: match[1] } }],
  },
  {
    open: /^<badge(?: variant="([^"]*)")?>/,
    close: "</badge>",
    marks: (match) => [match[1] ? { type: "badge", attrs: { variant: match[1] } } : { type: "badge" }],
  },
  { open: /^_/, close: "_", marks: () => [{ type: "italic" }] },
  // A model writes `*italic*` as readily as `_italic_`; the emitter picks the
  // second so that `***` can never be ambiguous, and the first is still read.
  { open: /^\*/, close: "*", marks: () => [{ type: "italic" }] },
];

/** The closer's index, skipping any that a backslash has made into text. */
function findClose(text: string, from: number, closer: string): number {
  for (let i = from; i < text.length; i++) {
    if (text[i] === "\\") {
      i++;
      continue;
    }
    if (text.startsWith(closer, i)) return i;
  }
  return -1;
}

function textNode(text: string, marks: DocumentMark[]): DocumentNode {
  return marks.length ? { type: "text", text, marks } : { type: "text", text };
}

interface Taken {
  readonly nodes: DocumentNode[];
  readonly next: number;
}

/** A code span: whatever is between two runs of the same length, verbatim. */
function takeCode(text: string, at: number, marks: DocumentMark[]): Taken | null {
  const run = /^`+/.exec(text.slice(at));
  if (!run) return null;
  const fence = run[0];
  const end = text.indexOf(fence, at + fence.length);
  if (end === -1 || text.startsWith("`", end + fence.length)) return null;
  const inner = text.slice(at + fence.length, end);
  return { nodes: [textNode(inner, [...marks, { type: "code" }])], next: end + fence.length };
}

function takeMath(text: string, at: number): Taken | null {
  if (text[at] !== "$") return null;
  const end = findClose(text, at + 1, "$");
  const latex = end === -1 ? "" : text.slice(at + 1, end);
  if (end === -1 || latex.includes("\n")) return null;
  return { nodes: [{ type: "inlineMath", attrs: { latex } }], next: end + 1 };
}

const TARGET = /^(\S+?)(?: "([^"]*)")?$/;

function takeLink(text: string, at: number, marks: DocumentMark[]): Taken | null {
  if (text[at] !== "[") return null;
  const label = findClose(text, at + 1, "]");
  if (label === -1 || text[label + 1] !== "(") return null;
  const end = findClose(text, label + 2, ")");
  if (end === -1) return null;
  const target = TARGET.exec(text.slice(label + 2, end));
  if (!target) return null;
  const attrs = target[2] ? { href: target[1], title: target[2] } : { href: target[1] };
  const inner = scan(text.slice(at + 1, label), [...marks, { type: "link", attrs }]);
  return { nodes: inner, next: end + 1 };
}

function takeWrapped(text: string, at: number, marks: DocumentMark[]): Taken | null {
  const rest = text.slice(at);
  for (const wrapper of WRAPPERS) {
    const match = wrapper.open.exec(rest);
    if (!match) continue;
    const from = at + match[0].length;
    const end = findClose(text, from, wrapper.close);
    // An empty run is not a run: without this, the second star of an unclosed
    // `**` closes the first as italic and both delimiters vanish.
    if (end === -1 || end === from) continue;
    const inner = scan(text.slice(from, end), [...marks, ...wrapper.marks(match)]);
    return { nodes: inner, next: end + wrapper.close.length };
  }
  return null;
}

function scan(text: string, marks: DocumentMark[]): DocumentNode[] {
  const nodes: DocumentNode[] = [];
  let buffer = "";
  let at = 0;

  const flush = () => {
    if (buffer) nodes.push(textNode(buffer, marks));
    buffer = "";
  };

  while (at < text.length) {
    const char = text[at];
    if (char === "\\") {
      if (text[at + 1] === "\n") {
        flush();
        nodes.push({ type: "hardBreak" });
        at += 2;
        continue;
      }
      buffer += text[at + 1] ?? "\\";
      at += 2;
      continue;
    }
    // A line that only wrapped is one sentence: markdown's soft break is a space.
    if (char === "\n") {
      buffer += " ";
      at++;
      continue;
    }
    const taken =
      takeCode(text, at, marks) ??
      takeMath(text, at) ??
      takeLink(text, at, marks) ??
      takeWrapped(text, at, marks);
    if (taken) {
      flush();
      nodes.push(...taken.nodes);
      at = taken.next;
      continue;
    }
    buffer += char;
    at++;
  }
  flush();
  return nodes;
}

/** Inline content as the editor stores it. */
export function parseInline(text: string): DocumentNode[] {
  return scan(text, []);
}
