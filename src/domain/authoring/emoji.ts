import type { DocumentBody, DocumentNode } from "@/domain/documents/body";

/**
 * Emoji removal, for an instance that turned them off.
 *
 * A prompt asking for no emoji is a request; this is the guarantee. It runs in
 * the deterministic pass after the model, like the other rules the style guide
 * states but cannot enforce.
 *
 * The spaces around a removed emoji go with it, so "🎉 Results" becomes
 * "Results" and "a 🎉 b" becomes "a b" — never a double space, never two words
 * glued together.
 */

// The joiner, the variation selector and the keycap go with the pictographs
// they decorate, so a composed emoji leaves nothing behind.
const EMOJI =
  /\s*[\p{Extended_Pictographic}\p{Emoji_Presentation}\u200D\uFE0F\u20E3]+\s*/gu;

export function stripEmojiFromText(text: string): string {
  return text.replace(EMOJI, (match, offset: number) =>
    offset === 0 || offset + match.length === text.length ? "" : " ",
  );
}

function stripNode(node: DocumentNode): DocumentNode {
  const next: DocumentNode =
    node.type === "text" && typeof node.text === "string"
      ? { ...node, text: stripEmojiFromText(node.text) }
      : node;
  if (!Array.isArray(next.content)) return next;
  return {
    ...next,
    // A text node emptied of its only emoji is dropped: an empty text node is
    // not something the editor schema accepts.
    content: next.content.map(stripNode).filter((child) => child.text !== ""),
  };
}

/** The same document with every emoji taken out of its text. */
export function stripEmoji(doc: DocumentBody): DocumentBody {
  if (doc?.type !== "doc" || !Array.isArray(doc.content)) return doc;
  return { ...doc, content: doc.content.map(stripNode) };
}
