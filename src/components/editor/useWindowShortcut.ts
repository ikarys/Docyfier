"use client";

import { useEffect } from "react";

/**
 * A shortcut that answers wherever the focus is (PLAN.md STEP U8).
 *
 * Saving and finding cannot be editor keymaps: the caret is often in a panel,
 * a search field, or nowhere at all when they are pressed. Both listen on the
 * window, so the listening is stated once here.
 */
export function useWindowShortcut(key: string, run: () => void): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key !== key) return;
      // The browser's own binding — save the page, find in page — is never what
      // is wanted inside a document editor.
      event.preventDefault();
      run();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [key, run]);
}
