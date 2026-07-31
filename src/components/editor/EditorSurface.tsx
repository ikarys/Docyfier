"use client";

import { useCallback, useState } from "react";
import { EditorContent, type Editor } from "@tiptap/react";
import type { Node as PMNode } from "@tiptap/pm/model";
import { DragHandle } from "@tiptap/extension-drag-handle-react";
import { findBlockAction } from "@/domain/authoring/block-actions/catalog";
import { SelectionAiMenu } from "../SelectionAiMenu";
import { BlockActionMenu } from "./BlockActionMenu";
import { useBlockAction } from "./useBlockAction";
import type { AiReview } from "./useAiReview";

/**
 * The sheet the document is written on: the editor itself, the selection menu
 * over it, and the drag handle beside it. Everything around it — toolbar,
 * panels, review bar — is the editor shell's business, not this one's.
 */
export function EditorSurface({
  editor,
  generating,
  review,
}: {
  editor: Editor;
  /** A generation has started but no block has arrived yet. */
  generating: boolean;
  review: AiReview;
}) {
  /** Position of the top-level block currently under the drag handle. */
  const [hovered, setHovered] = useState<{ pos: number; size: number } | null>(null);
  const blockAction = useBlockAction(editor, review);

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
      <SelectionAiMenu editor={editor} review={review} />
      <DragHandle
        editor={editor}
        className="drag-handle no-print"
        onNodeChange={onNodeChange}
      >
        <div className="drag-handle-controls">
          <BlockActionMenu
            running={blockAction.running}
            onPick={(action) => hovered && void blockAction.run(action, hovered)}
          />
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
      {/*
        Outside the menu on purpose: choosing an item closes the popover, so an
        indicator drawn inside it is unmounted the instant it would matter. The
        wait is the model thinking, which shows nothing in the document either.
      */}
      {blockAction.running && (
        <div className="ai-busy-bar no-print" role="status">
          <span className="spinner" aria-hidden />
          <span className="ai-diff-bar-label">
            {findBlockAction(blockAction.running)?.label ?? "Working"}…
          </span>
        </div>
      )}
      {blockAction.error && (
        <div className="gen-error-bar no-print" role="alert">
          <span className="ai-diff-bar-label">{blockAction.error}</span>
          <button className="btn" onClick={blockAction.dismissError}>
            Dismiss
          </button>
        </div>
      )}
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
