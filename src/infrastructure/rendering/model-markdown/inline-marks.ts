import type { DocumentMark, DocumentNode } from "@/domain/documents/body";

/**
 * Inline content on the way to a model: text, marks, and the escaping that
 * keeps a sentence from reading as syntax.
 *
 * Everything here returns `null` when it cannot be written without losing
 * something — an unknown mark, a link the editor pointed somewhere markdown
 * cannot name. The caller turns that into the JSON escape hatch, so the promise
 * "nothing is dropped" is kept by refusing rather than by guessing.
 */

/** Characters that would otherwise open a syntax of their own. */
const SYNTAX = /[\\`*_[\]<>~$]/g;

export const escapeText = (text: string): string => text.replace(SYNTAX, "\\$&");

/** A line opening with one of these reads as a block, whatever was meant. */
const BLOCK_OPENER = /^(#{1,6} |>|[-+] |\||:{3}|\$\$|\d+[.)] )/;

/**
 * Text that must stay a paragraph, whatever it starts with. The backslash is
 * the same escape the rest of the line uses, so unescaping needs no special
 * case for it.
 */
export function guardLineStarts(text: string): string {
  return text
    .split("\n")
    .map((line) => (BLOCK_OPENER.test(line) ? `\\${line}` : line))
    .join("\n");
}

/** Link attributes markdown writes, and what the others must still be. */
const LINK_TITLE = "title";
const LINK_UNSET: Record<string, unknown> = {
  target: "_blank",
  rel: "noopener noreferrer nofollow",
  class: null,
};

type Wrap = (text: string, attrs: Record<string, unknown> | undefined) => string | null;

/**
 * Innermost first: a run wearing several marks is wrapped in this order, so the
 * same set of marks always produces the same string. ProseMirror sorts a mark
 * set by schema rank when it reads one back, which is what makes the trip
 * symmetric without the order being part of the contract.
 */
const WRAPS: readonly { readonly type: string; readonly wrap: Wrap }[] = [
  { type: "bold", wrap: (text) => `**${text}**` },
  { type: "italic", wrap: (text) => `*${text}*` },
  { type: "strike", wrap: (text) => `~~${text}~~` },
  { type: "underline", wrap: (text) => `<u>${text}</u>` },
  { type: "subscript", wrap: (text) => `<sub>${text}</sub>` },
  { type: "superscript", wrap: (text) => `<sup>${text}</sup>` },
  {
    type: "badge",
    wrap: (text, attrs) => {
      const variant = attrs?.variant;
      return variant === undefined || variant === "blue"
        ? `<badge>${text}</badge>`
        : `<badge variant="${String(variant)}">${text}</badge>`;
    },
  },
  {
    type: "highlight",
    wrap: (text, attrs) => {
      const color = attrs?.color;
      return color === undefined || color === null
        ? `<mark>${text}</mark>`
        : `<mark style="background-color:${String(color)}">${text}</mark>`;
    },
  },
  {
    type: "textStyle",
    wrap: (text, attrs) => {
      const color = attrs?.color;
      // A textStyle carrying nothing is not a mark the reader would see; it is
      // also not one this format can name, so it goes back as JSON.
      if (color === undefined || color === null) return null;
      return `<span style="color:${String(color)}">${text}</span>`;
    },
  },
  {
    type: "link",
    wrap: (text, attrs) => {
      const href = attrs?.href;
      if (typeof href !== "string") return null;
      const beyond = Object.entries(LINK_UNSET).some(
        ([attr, unset]) => attrs?.[attr] !== undefined && attrs[attr] !== unset,
      );
      if (beyond) return null;
      const title = attrs?.[LINK_TITLE];
      return title ? `[${text}](${href} "${String(title)}")` : `[${text}](${href})`;
    },
  },
];

const WRAPPED = new Set([...WRAPS.map((entry) => entry.type), "code"]);

/** A code span long enough to hold its own backticks. */
function codeSpan(text: string): string | null {
  // A span may not begin or end with a backtick: markdown would eat the space
  // it needs to, and the trip back would not be exact.
  if (text.startsWith("`") || text.endsWith("`")) return null;
  const runs = [...text.matchAll(/`+/g)].map((match) => match[0].length);
  const fence = "`".repeat(Math.max(0, ...runs) + 1);
  return `${fence}${text}${fence}`;
}

function markedText(node: DocumentNode): string | null {
  const marks: DocumentMark[] = node.marks ?? [];
  if (marks.some((mark) => !WRAPPED.has(mark.type))) return null;

  const raw = node.text ?? "";
  const inCode = marks.some((mark) => mark.type === "code");
  let out = inCode ? codeSpan(raw) : escapeText(raw);

  for (const { type, wrap } of WRAPS) {
    const mark = marks.find((candidate) => candidate.type === type);
    if (!mark || out === null) continue;
    out = wrap(out, mark.attrs);
  }
  return out;
}

function inlineNode(node: DocumentNode): string | null {
  if (node.type === "hardBreak") return "\\\n";
  if (node.type === "inlineMath") return `$${String(node.attrs?.latex ?? "")}$`;
  if (node.type === "text") return markedText(node);
  return null;
}

/** Inline content as markdown, or null when something would be lost. */
export function inlineToModelMarkdown(nodes: DocumentNode[] | undefined): string | null {
  if (!nodes) return "";
  const parts: string[] = [];
  for (const node of nodes) {
    const part = inlineNode(node);
    if (part === null) return null;
    parts.push(part);
  }
  return parts.join("");
}
