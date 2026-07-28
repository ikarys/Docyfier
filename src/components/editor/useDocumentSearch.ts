"use client";

import { useCallback, useEffect, useReducer, useState } from "react";
import type { Editor } from "@tiptap/react";
import { findMatches } from "@/domain/documents/text-matches";
import { replaceMatches, searchableBlocks } from "@/infrastructure/editor/search";
import { EMPTY_SEARCH, searchReducer, type SearchAction, type SearchSession } from "./search-session";
import { useWindowShortcut } from "./useWindowShortcut";

export interface DocumentSearch {
  readonly open: boolean;
  readonly session: SearchSession;
  dispatch(action: SearchAction): void;
  close(): void;
  /** Rewrite the occurrence the writer is standing on. */
  replaceActive(): void;
  /** Rewrite every occurrence — one transaction, one undo. */
  replaceAll(): void;
}

/**
 * Find & replace over the open document (PLAN.md STEP U8). The matching rule
 * lives in the domain and the highlighting in the editor extension; what is
 * left here is when to run them: `Mod-F` opens, an edit re-runs the search, and
 * every replacement goes through a single transform.
 */
export function useDocumentSearch(editor: Editor | null): DocumentSearch {
  const [open, setOpen] = useState(false);
  const [session, dispatch] = useReducer(searchReducer, EMPTY_SEARCH);
  /** Bumped on every edit, so the matches are those of the current document. */
  const [edits, setEdits] = useState(0);

  useWindowShortcut("f", useCallback(() => setOpen(true), []));

  useEffect(() => {
    if (!editor) return;
    const bump = () => setEdits((count) => count + 1);
    editor.on("update", bump);
    return () => {
      editor.off("update", bump);
    };
  }, [editor]);

  const { query, caseSensitive, wholeWord, matches, active, replacement } = session;

  useEffect(() => {
    if (!editor || !open) return;
    dispatch({
      type: "found",
      matches: findMatches(searchableBlocks(editor.state.doc), query, {
        caseSensitive,
        wholeWord,
      }),
    });
  }, [editor, open, query, caseSensitive, wholeWord, edits]);

  useEffect(() => {
    if (!editor) return;
    if (!open) {
      editor.commands.clearSearchMatches();
      return;
    }
    editor.commands.setSearchMatches(matches, active);
    document
      .querySelector(".search-match.is-active")
      ?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [editor, open, matches, active]);

  const rewrite = useCallback(
    (targets: readonly { from: number; to: number }[]) => {
      if (!editor || targets.length === 0) return;
      editor
        .chain()
        .command(({ tr }) => {
          replaceMatches(tr, targets, replacement);
          return true;
        })
        .run();
    },
    [editor, replacement],
  );

  const close = useCallback(() => {
    setOpen(false);
    dispatch({ type: "close" });
    editor?.commands.focus();
  }, [editor]);

  return {
    open,
    session,
    dispatch,
    close,
    replaceActive: () => rewrite(active < 0 ? [] : [matches[active]]),
    replaceAll: () => rewrite(matches),
  };
}
