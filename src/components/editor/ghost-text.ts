"use client";

import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet, type EditorView } from "@tiptap/pm/view";
import {
  continuationJoin,
  ghostStands,
  type GhostSuggestion,
} from "./ghost-suggestion";

/**
 * The continuation shown as ghost text (PLAN.md STEP U11): `Tab` takes it,
 * `Escape` throws it away, and one keystroke of the writer's own dismisses it.
 *
 * A decoration, not a node: nothing suggested is ever part of the document, so
 * a save that lands mid-suggestion cannot store it. Accepting is one
 * transaction, which is what makes it one undo.
 */

export const GHOST_CONTINUE_EVENT = "docyfier:continue-writing";

const ghostText = new PluginKey<GhostSuggestion | null>("ghostText");

export function showGhost(view: EditorView, suggestion: GhostSuggestion): void {
  view.dispatch(view.state.tr.setMeta(ghostText, suggestion));
}

export function clearGhost(view: EditorView): void {
  if (ghostText.getState(view.state)) {
    view.dispatch(view.state.tr.setMeta(ghostText, null));
  }
}

/** The text before the caret in its own block — what the join rule reads. */
export function textBeforeCaret(view: EditorView): string {
  const { $from } = view.state.selection;
  return $from.parent.textBetween(0, $from.parentOffset, undefined, " ");
}

function accept(view: EditorView, ghost: GhostSuggestion): boolean {
  const insert = continuationJoin(textBeforeCaret(view), ghost.text);
  if (insert === "") return false;
  view.dispatch(
    view.state.tr.insertText(insert, ghost.at).setMeta(ghostText, null).scrollIntoView(),
  );
  return true;
}

export const GhostText = Extension.create({
  name: "ghostText",

  addProseMirrorPlugins() {
    return [
      new Plugin<GhostSuggestion | null>({
        key: ghostText,
        state: {
          init: () => null,
          apply(tr, current) {
            const meta = tr.getMeta(ghostText) as GhostSuggestion | null | undefined;
            if (meta !== undefined) return meta;
            if (!current) return null;
            // The document moved under it, or the writer did: a suggestion that
            // no longer sits at the caret is a suggestion about another moment.
            const at = tr.mapping.map(current.at);
            const moved = { ...current, at };
            return ghostStands(moved, tr.selection.from) ? moved : null;
          },
        },
        props: {
          decorations(state) {
            const ghost = ghostText.getState(state);
            if (!ghost) return null;
            return DecorationSet.create(state.doc, [
              Decoration.widget(
                ghost.at,
                () => {
                  const span = document.createElement("span");
                  span.className = "ghost-text";
                  span.textContent = ghost.text;
                  return span;
                },
                { side: 1 },
              ),
            ]);
          },
          handleKeyDown(view, event) {
            const ghost = ghostText.getState(view.state);
            if (!ghost) return false;
            if (event.key === "Tab") return accept(view, ghost);
            if (event.key === "Escape") {
              clearGhost(view);
              return true;
            }
            return false;
          },
        },
      }),
    ];
  },

  addKeyboardShortcuts() {
    return {
      // Asking is React's business — the answer comes from the server — so the
      // keymap only says that it was asked for.
      "Mod-Enter": () => {
        this.editor.view.dom.dispatchEvent(
          new CustomEvent(GHOST_CONTINUE_EVENT, { bubbles: true }),
        );
        return true;
      },
    };
  },
});
