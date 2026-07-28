"use client";

import { useEffect, useRef, useState } from "react";
import type { Editor, JSONContent } from "@tiptap/react";
import { deleteDocumentAction } from "@/app/actions";
import { fillDocumentAction } from "@/app/ai-actions";
import { ndjsonLines, stashGenerateError, takePrompt } from "@/components/editor/generation-handover";
import type { DocumentTheme } from "@/lib/themes";
import type { Autosave } from "./useAutosave";

/**
 * Prompt-to-document (STEP U4).
 *
 * The home hero created this document empty and left the prompt behind; the
 * blocks are streamed in as the model writes them, so the first one is on
 * screen in seconds instead of after the whole document. A provider that cannot
 * stream falls back to one blocking call, and a generation that produced
 * nothing takes the empty document with it rather than leaving litter behind.
 */

export interface Generation {
  /** Blocks received so far; null when no generation is running. */
  streamed: number | null;
  error: string | null;
  dismissError(): void;
}

export function useStreamedGeneration(
  id: string,
  editor: Editor | null,
  autosave: Autosave,
  dress: (theme: DocumentTheme) => void,
): Generation {
  const [streamed, setStreamed] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);
  const { saveNow, setStreaming } = autosave;

  useEffect(() => {
    if (!editor || started.current) return;
    started.current = true;
    const prompt = takePrompt(id);
    if (!prompt) return;

    let cancelled = false;
    let count = 0;

    const append = (block: JSONContent) => {
      // The first block takes the place of the empty document's paragraph.
      if (count === 0) {
        editor.commands.setContent(
          { type: "doc", content: [block] },
          { emitUpdate: false },
        );
      } else {
        editor.commands.insertContentAt(editor.state.doc.content.size, block);
      }
      count++;
      setStreamed(count);
    };

    const streamInto = async (body: ReadableStream<Uint8Array>): Promise<string | null> => {
      let failure: string | null = null;
      for await (const entry of ndjsonLines(body)) {
        if (cancelled) return null;
        if (entry.block) append(entry.block as JSONContent);
        else if (entry.theme) dress(entry.theme as DocumentTheme);
        else if (typeof entry.error === "string") failure = entry.error;
      }
      return failure;
    };

    /** Same generation, one blocking call, for a provider without streaming. */
    const generateAtOnce = async (): Promise<string | null> => {
      const fallback = await fillDocumentAction(id, prompt);
      if (!fallback.ok) return fallback.error;
      if (fallback.theme) dress(fallback.theme);
      editor.commands.setContent(fallback.content, { emitUpdate: false });
      count = fallback.content.content?.length ?? 1;
      setStreamed(count);
      return null;
    };

    const run = async () => {
      setStreaming(true);
      setStreamed(0);
      let failure: string | null = null;
      try {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ prompt }),
        });
        failure =
          res.ok && res.body ? await streamInto(res.body) : await generateAtOnce();
      } catch (err) {
        failure = err instanceof Error ? err.message : "Generation failed";
      }

      setStreaming(false);
      setStreamed(null);
      if (cancelled) return;

      if (count > 0) {
        saveNow();
        if (failure) setError(failure);
        return;
      }
      // Nothing was produced: the empty document would only be litter.
      stashGenerateError(failure ?? "The AI returned an empty document.");
      await deleteDocumentAction(id);
    };

    void run();
    return () => {
      cancelled = true;
      setStreaming(false);
    };
  }, [dress, editor, id, saveNow, setStreaming]);

  return { streamed, error, dismissError: () => setError(null) };
}
