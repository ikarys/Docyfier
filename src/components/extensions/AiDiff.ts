import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { Node as PMNode } from "@tiptap/pm/model";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { BlockMark } from "@/lib/doc/diff";

/**
 * Highlights the top-level blocks an AI edit just touched (PLAN.md STEP U4).
 *
 * Markers are ProseMirror decorations, never node attributes: they live outside
 * the document, so nothing about a pending review can ever reach the saved
 * JSON, and they survive editing because the set is mapped through every
 * transaction.
 */

const aiDiffKey = new PluginKey<DecorationSet>("aiDiff");

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    aiDiff: {
      /** Mark blocks by their index in the current document. */
      setAiDiff: (marks: BlockMark[]) => ReturnType;
      /** Drop every marker (review accepted or abandoned). */
      clearAiDiff: () => ReturnType;
    };
  }
}

function buildDecorations(doc: PMNode, marks: BlockMark[]): DecorationSet {
  const decorations: Decoration[] = [];
  doc.forEach((node, offset, index) => {
    const mark = marks[index];
    if (!mark || mark === "same") return;
    decorations.push(
      Decoration.node(offset, offset + node.nodeSize, {
        class: `ai-diff-block ai-diff-${mark}`,
      }),
    );
  });
  return DecorationSet.create(doc, decorations);
}

export const AiDiff = Extension.create({
  name: "aiDiff",

  addCommands() {
    return {
      setAiDiff:
        (marks: BlockMark[]) =>
        ({ tr, dispatch }) => {
          if (dispatch) dispatch(tr.setMeta(aiDiffKey, marks));
          return true;
        },
      clearAiDiff:
        () =>
        ({ tr, dispatch }) => {
          if (dispatch) dispatch(tr.setMeta(aiDiffKey, null));
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin<DecorationSet>({
        key: aiDiffKey,
        state: {
          init: () => DecorationSet.empty,
          apply(tr, value) {
            const marks = tr.getMeta(aiDiffKey) as BlockMark[] | null | undefined;
            if (marks === null) return DecorationSet.empty;
            if (marks) return buildDecorations(tr.doc, marks);
            return value.map(tr.mapping, tr.doc);
          },
        },
        props: {
          decorations(state) {
            return aiDiffKey.getState(state);
          },
        },
      }),
    ];
  },
});
