"use client";

import type { RefObject } from "react";
import type { AssistantMessage } from "./useDocumentAssistant";

/**
 * The panel's conversation. An answer to a question carries the headings it
 * came from and a way into the document — until it is asked for, it has
 * changed nothing.
 */
export function AiThread({
  messages,
  busy,
  edits,
  empty,
  thread,
  onInsert,
}: {
  messages: AssistantMessage[];
  busy: boolean;
  /** Edits received so far while one instruction is running. */
  edits: number;
  /** What the thread says before anything has been asked. */
  empty: string;
  thread: RefObject<HTMLDivElement | null>;
  onInsert: (text: string) => void;
}) {
  return (
    <div className="ai-thread" ref={thread}>
      {messages.length === 0 && <p className="ai-empty">{empty}</p>}
      {messages.map((message, i) => (
        <div
          key={i}
          className={`ai-msg ai-msg-${message.role}${message.error ? " ai-msg-error" : ""}`}
        >
          {message.text}
          {message.answer && (
            <div className="ai-answer-foot">
              {message.answer.sections.length > 0 && (
                <span className="ai-answer-sources">
                  From: {message.answer.sections.join(" · ")}
                </span>
              )}
              <button
                className="chip"
                onClick={() => onInsert(message.answer!.text)}
                title="Put this answer into the document"
              >
                Insert
              </button>
            </div>
          )}
        </div>
      ))}
      {busy && (
        <div className="ai-msg ai-msg-ai ai-msg-busy">
          <span className="spinner" aria-hidden />{" "}
          {edits ? `Working… ${edits} edit${edits > 1 ? "s" : ""}` : "Working…"}
        </div>
      )}
    </div>
  );
}
