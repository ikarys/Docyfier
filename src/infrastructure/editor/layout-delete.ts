import type { KeyboardShortcutCommand } from "@tiptap/core";

/**
 * Backspace at the very start of a layout block deletes the whole block.
 *
 * Layout containers (cardGrid, statRow, columnList, timeline, stepList,
 * pyramid) are `isolating`, so they can never be merged away by the default
 * Backspace/join behavior — without this they get stuck in the document with
 * no way to remove them. Wired into each container's `addKeyboardShortcuts`.
 */
export function deleteLayoutBlockOnBackspace(name: string): KeyboardShortcutCommand {
  return ({ editor }) => {
    const { selection } = editor.state;
    if (!selection.empty) return false;
    const { $from } = selection;

    for (let depth = $from.depth; depth > 0; depth--) {
      if ($from.node(depth).type.name !== name) continue;

      // Only fire when the cursor sits at the absolute start of the block:
      // first child at every level down to the caret, and offset 0.
      for (let level = depth; level < $from.depth; level++) {
        if ($from.index(level) !== 0) return false;
      }
      if ($from.parentOffset !== 0) return false;

      const from = $from.before(depth);
      const to = from + $from.node(depth).nodeSize;
      return editor.chain().deleteRange({ from, to }).run();
    }
    return false;
  };
}
