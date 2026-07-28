"use client";

import type { EditorProps } from "@tiptap/pm/view";
import { imageFilesOf, insertUploadedImages } from "./image-upload";
import { insertPastedText } from "./paste-insert";

/**
 * What the editing surface does with what is dropped or pasted onto it. It is
 * a piece of behaviour, not markup, so it lives beside the modules it calls
 * rather than inside the component that renders the sheet.
 */
export function documentEditorProps(): EditorProps {
  return {
    attributes: { class: "doc doc-editor" },

    handlePaste: (view, event) => {
      // Images first: uploaded, then inserted by URL. Claiming the event keeps
      // ProseMirror from also inserting the browser's own base64 copy.
      const files = imageFilesOf(event.clipboardData?.files ?? null);
      if (files.length > 0) {
        void insertUploadedImages(view, files, view.state.selection.from);
        return true;
      }
      // Then text that deserves better than a wall of characters: a spreadsheet
      // range, a markdown snippet.
      return event.clipboardData ? insertPastedText(view, event.clipboardData) : false;
    },

    handleDrop: (view, event, _slice, moved) => {
      if (moved) return false;
      const files = imageFilesOf(event.dataTransfer?.files ?? null);
      if (files.length === 0) return false;
      const at = view.posAtCoords({ left: event.clientX, top: event.clientY });
      void insertUploadedImages(view, files, at?.pos ?? view.state.selection.from);
      return true;
    },
  };
}
