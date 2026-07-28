import { Extension } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { Transform } from "@tiptap/pm/transform";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { SearchableBlock, TextMatch } from "@/domain/documents/text-matches";

/**
 * The document side of find & replace (PLAN.md STEP U8): the text a search runs
 * against, the highlights it draws, and the one transform a replace-all is.
 *
 * The matching rule itself is not here — it is
 * `src/domain/documents/text-matches.ts`, which knows nothing of ProseMirror.
 * This module only translates between positions and text.
 */

interface SearchHighlight {
  readonly matches: readonly TextMatch[];
  readonly active: number;
}

const NOTHING_FOUND: SearchHighlight = { matches: [], active: -1 };

const searchKey = new PluginKey<SearchHighlight>("search");

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    search: {
      /** Highlight found occurrences, one of them as the current one. */
      setSearchMatches: (matches: readonly TextMatch[], active: number) => ReturnType;
      /** Drop every highlight (the search bar closed). */
      clearSearchMatches: () => ReturnType;
    };
  }
}

/**
 * The text of a document, block by block, each with the position it starts at.
 *
 * A run stops at anything that is not text — a line break, an inline node —
 * because positions past such a node no longer line up with the string, and a
 * match that spans one would highlight the wrong characters.
 */
export function searchableBlocks(doc: PMNode): SearchableBlock[] {
  const blocks: SearchableBlock[] = [];

  doc.descendants((node, pos) => {
    if (!node.isTextblock) return true;
    let text = "";
    let from = pos + 1;
    node.forEach((child, offset) => {
      if (child.isText) {
        text += child.text ?? "";
        return;
      }
      if (text !== "") blocks.push({ text, from });
      text = "";
      from = pos + 1 + offset + child.nodeSize;
    });
    if (text !== "") blocks.push({ text, from });
    return false;
  });

  return blocks;
}

/**
 * Every match rewritten in one transform, so one undo takes them all back.
 * Applied from the last to the first: earlier positions are still true after a
 * later one has changed length.
 */
export function replaceMatches<T extends Transform>(
  transform: T,
  matches: readonly TextMatch[],
  replacement: string,
): T {
  const { schema } = transform.doc.type;
  for (const match of [...matches].reverse()) {
    if (replacement === "") transform.delete(match.from, match.to);
    else transform.replaceWith(match.from, match.to, schema.text(replacement));
  }
  return transform;
}

export const Search = Extension.create({
  name: "search",

  addCommands() {
    return {
      setSearchMatches:
        (matches: readonly TextMatch[], active: number) =>
        ({ tr, dispatch }) => {
          if (dispatch) dispatch(tr.setMeta(searchKey, { matches, active }));
          return true;
        },
      clearSearchMatches:
        () =>
        ({ tr, dispatch }) => {
          if (dispatch) dispatch(tr.setMeta(searchKey, NOTHING_FOUND));
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin<SearchHighlight>({
        key: searchKey,
        state: {
          init: () => NOTHING_FOUND,
          apply(tr, value) {
            const found = tr.getMeta(searchKey) as SearchHighlight | undefined;
            if (found) return found;
            // Matches are re-run against the new document on every edit, so a
            // stale set is dropped rather than mapped through the transaction.
            return tr.docChanged ? NOTHING_FOUND : value;
          },
        },
        props: {
          decorations(state) {
            const found = searchKey.getState(state);
            if (!found || found.matches.length === 0) return null;
            return DecorationSet.create(
              state.doc,
              found.matches.map((match, index) =>
                Decoration.inline(match.from, match.to, {
                  class:
                    index === found.active ? "search-match is-active" : "search-match",
                }),
              ),
            );
          },
        },
      }),
    ];
  },
});
