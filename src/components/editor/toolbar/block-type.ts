import type { Editor } from "@tiptap/react";

/**
 * What the caret is sitting in, and what it could become (PLAN.md STEP U9).
 *
 * The toolbar shows one control instead of eight buttons, so it has to name the
 * current block. Which block that is depends only on what is active — passed in
 * as a predicate, so the rule is decided here and tested without an editor.
 */

export interface BlockType {
  readonly id: string;
  readonly label: string;
  readonly hint: string;
  /** What the editor is asked when checking whether this type is current. */
  readonly active: { readonly name: string; readonly attrs?: Record<string, unknown> };
  /**
   * How deep this type sits when blocks nest. A quote holds a list, a list
   * holds a code block: when several claim the caret at once, the deepest is
   * the one the writer is actually in.
   */
  readonly depth: number;
  readonly apply: (editor: Editor) => void;
}

export type ActiveCheck = (name: string, attrs?: Record<string, unknown>) => boolean;

const heading = (level: 1 | 2 | 3): BlockType => ({
  id: `heading${level}`,
  label: `Heading ${level}`,
  hint: `Section title, level ${level}`,
  active: { name: "heading", attrs: { level } },
  depth: 0,
  apply: (editor) => editor.chain().focus().setNode("heading", { level }).run(),
});

/** In the order the menu offers them, plainest first. */
export const BLOCK_TYPES: BlockType[] = [
  {
    id: "paragraph",
    label: "Paragraph",
    hint: "Body text",
    active: { name: "paragraph" },
    depth: 0,
    apply: (editor) => editor.chain().focus().setParagraph().run(),
  },
  heading(1),
  heading(2),
  heading(3),
  {
    id: "bulletList",
    label: "Bullet list",
    hint: "Unordered items",
    active: { name: "bulletList" },
    depth: 2,
    apply: (editor) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    id: "orderedList",
    label: "Numbered list",
    hint: "Ordered items",
    active: { name: "orderedList" },
    depth: 2,
    apply: (editor) => editor.chain().focus().toggleOrderedList().run(),
  },
  {
    id: "blockquote",
    label: "Quote",
    hint: "Quoted passage",
    active: { name: "blockquote" },
    depth: 1,
    apply: (editor) => editor.chain().focus().toggleBlockquote().run(),
  },
  {
    id: "codeBlock",
    label: "Code block",
    hint: "Preformatted code",
    active: { name: "codeBlock" },
    depth: 3,
    apply: (editor) => editor.chain().focus().toggleCodeBlock().run(),
  },
];

const PARAGRAPH = BLOCK_TYPES[0];

/** The type to show on the control: the innermost one that claims the caret. */
export function currentBlockType(isActive: ActiveCheck): BlockType {
  return BLOCK_TYPES.filter((type) => isActive(type.active.name, type.active.attrs)).reduce(
    (deepest, type) => (type.depth >= deepest.depth ? type : deepest),
    PARAGRAPH,
  );
}
