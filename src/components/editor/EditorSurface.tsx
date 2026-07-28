"use client";

import { useCallback, useState } from "react";
import { EditorContent, type Editor } from "@tiptap/react";
import type { Node as PMNode } from "@tiptap/pm/model";
import { DragHandle } from "@tiptap/extension-drag-handle-react";
import { SelectionAiMenu } from "../SelectionAiMenu";

/**
 * The sheet the document is written on: the editor itself, the selection menu
 * over it, and the drag handle beside it. Everything around it — toolbar,
 * panels, review bar — is the editor shell's business, not this one's.
 */
export function EditorSurface({
  editor,
  generating,
  onAiEdit,
}: {
  editor: Editor;
  /** A generation has started but no block has arrived yet. */
  generating: boolean;
  onAiEdit: (apply: () => void) => void;
}) {
  /** Position of the top-level block currently under the drag handle. */
  const [hovered, setHovered] = useState<{ pos: number; size: number } | null>(null);

  // Stable identity: DragHandle re-registers its ProseMirror plugin whenever
  // this callback's reference changes, so an inline arrow here would loop.
  const onNodeChange = useCallback(
    ({ node, pos }: { node: PMNode | null; pos: number }) =>
      setHovered(node ? { pos, size: node.nodeSize } : null),
    [],
  );

  /** Insert an empty paragraph below the hovered block and open the slash menu. */
  const insertBelow = () => {
    if (!hovered) return;
    const at = hovered.pos + hovered.size;
    editor
      .chain()
      .focus()
      .insertContentAt(at, { type: "paragraph" })
      .setTextSelection(at + 1)
      .insertContent("/")
      .run();
  };

  return (
    <article className="doc-sheet">
      {generating && <GenerationSkeleton />}
      <EditorContent editor={editor} />
      <SelectionAiMenu editor={editor} onAiEdit={onAiEdit} />
      <DragHandle
        editor={editor}
        className="drag-handle no-print"
        onNodeChange={onNodeChange}
      >
        <div className="drag-handle-controls">
          <button
            type="button"
            className="drag-handle-btn"
            title="Insert block below"
            onClick={insertBelow}
          >
            +
          </button>
          <span className="drag-handle-grip" title="Drag to reorder">
            ⋮⋮
          </span>
        </div>
      </DragHandle>
    </article>
  );
}

/** What stands in for the document until the first generated block arrives. */
function GenerationSkeleton() {
  return (
    <div className="gen-skeleton no-print" aria-label="Generating…">
      <span className="gen-skeleton-line gen-skeleton-title" />
      <span className="gen-skeleton-line" />
      <span className="gen-skeleton-line" />
      <span className="gen-skeleton-line gen-skeleton-short" />
    </div>
  );
}
