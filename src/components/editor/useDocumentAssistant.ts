"use client";

import { useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import type { JSONContent } from "@tiptap/core";
import { transformDocumentAction } from "@/app/ai-actions";
import { toPlainJSON } from "@/infrastructure/documents/editor-body";
import { applyTransform } from "./applied-transform";

/** One line of the panel's thread. */
export interface AssistantMessage {
  role: "user" | "ai";
  text: string;
  error?: boolean;
}

/**
 * The assistant's side of the conversation: send the document with an
 * instruction, apply what comes back, and say what happened.
 */
export function useDocumentAssistant(
  editor: Editor,
  apply: (content: JSONContent) => void,
) {
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const thread = useRef<HTMLDivElement | null>(null);

  const say = (message: AssistantMessage) => {
    setMessages((prev) => [...prev, message]);
    requestAnimationFrame(() => {
      thread.current?.scrollTo({ top: thread.current.scrollHeight });
    });
  };

  const ask = async (instruction: string, label?: string) => {
    if (busy) return;
    setBusy(true);
    say({ role: "user", text: label ?? instruction });
    const before = toPlainJSON(editor.getJSON());

    // `busy` gates the composer, so it has to fall back whatever happens: a
    // request that never returns would otherwise leave the panel spinning with
    // no message and no way to retry short of reloading the page.
    try {
      const res = await transformDocumentAction(before, instruction);
      if (!res.ok) {
        say({ role: "ai", text: res.error, error: true });
        return;
      }

      const { next, changed, blocksEdited } = applyTransform(before, res.outcome);
      if (!changed) {
        say({
          role: "ai",
          text: "The AI returned the document unchanged — try a more specific instruction.",
          error: true,
        });
        return;
      }

      apply(next);
      say({
        role: "ai",
        text: blocksEdited
          ? `Done — ${blocksEdited} block${blocksEdited > 1 ? "s" : ""} edited.`
          : "Done — applied to the document.",
      });
    } catch (err) {
      say({
        role: "ai",
        text: err instanceof Error ? err.message : "The AI request failed.",
        error: true,
      });
    } finally {
      setBusy(false);
    }
  };

  return { messages, busy, ask, thread };
}
