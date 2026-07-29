"use client";

import { useEffect, useRef, useState } from "react";
import type { CaretPrompt as Prompt } from "./useCaretPrompt";

/**
 * The prompt `Mod-K` opens where the caret is (PLAN.md STEP U11). It floats in
 * viewport coordinates rather than in the sheet, because the sheet scrolls
 * under it and the caret is what it must stay attached to.
 */
export function CaretPrompt({ prompt }: { prompt: Prompt }) {
  const [instruction, setInstruction] = useState("");
  const input = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (prompt.at) input.current?.focus();
  }, [prompt.at]);

  if (!prompt.at) return null;

  return (
    <div
      className="caret-prompt no-print"
      style={{ left: prompt.at.left, top: prompt.at.top }}
      role="dialog"
      aria-label="Ask the AI here"
    >
      <span className="caret-prompt-mark" aria-hidden="true">
        ✦
      </span>
      <input
        ref={input}
        className="caret-prompt-input"
        placeholder={prompt.busy ? "Writing…" : "Ask the AI to write here…"}
        value={instruction}
        disabled={prompt.busy}
        onChange={(e) => setInstruction(e.target.value)}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === "Enter") void prompt.ask(instruction);
          if (e.key === "Escape") prompt.close();
        }}
      />
      {prompt.busy && (
        <span className="caret-prompt-count">
          {prompt.written > 0 ? `${prompt.written} block${prompt.written > 1 ? "s" : ""}` : "…"}
        </span>
      )}
      {prompt.error && <span className="caret-prompt-error">{prompt.error}</span>}
    </div>
  );
}
