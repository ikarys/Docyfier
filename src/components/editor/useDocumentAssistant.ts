"use client";

import { useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import type { JSONContent } from "@tiptap/core";
import { askAboutDocumentAction } from "@/app/ai-actions";
import { digestOf } from "@/domain/authoring/document-digest";
import { toPlainJSON } from "@/infrastructure/documents/editor-body";
import { applyTransform } from "./applied-transform";
import { requestTransform } from "./streamed-transform";

/** One line of the panel's thread. */
export interface AssistantMessage {
  role: "user" | "ai";
  text: string;
  error?: boolean;
  /**
   * An answer to a question, which changed nothing: the writer decides whether
   * any of it goes into the document, and the headings it came from say where
   * to check it.
   */
  answer?: { text: string; sections: string[] };
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
  /** Edits received so far while one is running — what "Working…" counts. */
  const [edits, setEdits] = useState(0);
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
    setEdits(0);
    say({ role: "user", text: label ?? instruction });
    const before = toPlainJSON(editor.getJSON());

    // `busy` gates the composer, so it has to fall back whatever happens: a
    // request that never returns would otherwise leave the panel spinning with
    // no message and no way to retry short of reloading the page.
    try {
      const res = await requestTransform(before, instruction, setEdits);
      if (!res.outcome) {
        say({ role: "ai", text: res.error ?? "The AI request failed.", error: true });
        return;
      }

      const { next, changed, blocksEdited } = applyTransform(before, res.outcome);
      // A stream that failed halfway still carries the edits that made it: they
      // are applied, and the reason the rest is missing is said out loud.
      if (res.error && !changed) {
        say({ role: "ai", text: res.error, error: true });
        return;
      }
      if (!changed) {
        say({
          role: "ai",
          text: "The AI returned the document unchanged — try a more specific instruction.",
          error: true,
        });
        return;
      }

      apply(next);
      const done = blocksEdited
        ? `${blocksEdited} block${blocksEdited > 1 ? "s" : ""} edited`
        : "applied to the document";
      say(
        res.error
          ? { role: "ai", text: `${done}, then it stopped — ${res.error}`, error: true }
          : { role: "ai", text: `Done — ${done}.` },
      );
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

  /**
   * A question, not an instruction: the document is read through its digest and
   * nothing is written. The answer waits in the thread until it is inserted.
   */
  const question = async (asked: string) => {
    if (busy) return;
    setBusy(true);
    setEdits(0);
    say({ role: "user", text: asked });

    try {
      const res = await askAboutDocumentAction(digestOf(toPlainJSON(editor.getJSON())), asked);
      if (!res.ok) {
        say({ role: "ai", text: res.error, error: true });
        return;
      }
      say({
        role: "ai",
        text: res.answer.answer,
        answer: { text: res.answer.answer, sections: res.answer.sections },
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

  return { messages, busy, edits, ask, question, thread };
}
