"use client";

import { useCallback, useState } from "react";
import type { Editor } from "@tiptap/react";
import { restyleDocumentAction } from "@/app/ai-actions";
import { toPlainJSON } from "@/infrastructure/documents/editor-body";
import type { DocumentTheme } from "@/lib/themes";

/**
 * "Style for me": ask the model what this document should look like and wear
 * its answer. Content never travels back — the document is read, and only the
 * theme changes, which is what makes the button safe to press mid-edit.
 */
export interface Restyle {
  run(): Promise<void>;
  busy: boolean;
  error: string | null;
}

export function useRestyle(
  editor: Editor,
  dress: (theme: DocumentTheme) => void,
): Restyle {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await restyleDocumentAction(toPlainJSON(editor.getJSON()));
      if (result.ok) dress(result.theme);
      else setError(result.error);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The AI request failed.");
    } finally {
      setBusy(false);
    }
  }, [dress, editor]);

  return { run, busy, error };
}
