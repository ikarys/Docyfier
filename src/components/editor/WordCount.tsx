"use client";

import { useEffect, useState } from "react";
import type { Editor } from "@tiptap/react";
import { readingMinutes } from "@/domain/documents/reading-time";

/**
 * How long the document is, in the toolbar (PLAN.md STEP U8). The count comes
 * from the editor's own character-count storage — one traversal, already done —
 * and the minutes from the domain.
 */
export function WordCount({ editor }: { editor: Editor }) {
  const [words, setWords] = useState(() => editor.storage.characterCount.words());

  useEffect(() => {
    const recount = () => setWords(editor.storage.characterCount.words());
    recount();
    editor.on("update", recount);
    return () => {
      editor.off("update", recount);
    };
  }, [editor]);

  if (words === 0) return null;

  const minutes = readingMinutes(words);
  return (
    <span className="word-count" title={`About ${minutes} min to read`}>
      {words.toLocaleString()} words · {minutes} min
    </span>
  );
}
