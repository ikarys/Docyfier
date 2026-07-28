"use client";

import type { Editor } from "@tiptap/core";

/**
 * Asking for a URL and putting it on the selection (PLAN.md STEP U8). One home
 * for the rule — an empty answer clears the link, a cancel changes nothing —
 * because the selection bar and `Mod-K` must behave identically.
 */
export function promptForLink(editor: Editor): boolean {
  const current = (editor.getAttributes("link").href as string | undefined) ?? "";
  const url = window.prompt("Link URL", current);
  if (url === null) return false;

  if (url.trim() === "") {
    editor.chain().focus().unsetLink().run();
    return true;
  }
  editor.chain().focus().setLink({ href: url.trim() }).run();
  return true;
}
