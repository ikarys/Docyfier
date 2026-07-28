import type { DocumentBody } from "@/domain/documents/body";

/**
 * What composing needs from the outside world — the two ports, not a backend.
 *
 * A composer builds a prompt and reads back a document. Which model answers it,
 * and how Markdown becomes a document, are somebody else's problem: that is
 * what lets a composer be tested with no model and no parser behind it.
 */

/** A prompt with nothing left to decide: the composer's temperature, or the
 * default it declined to override. */
export interface AnswerRequest {
  system: string;
  prompt: string;
  temperature: number;
}

export interface AnswerWriter {
  /** The model's answer, as the Markdown every composer asks it for. */
  write(request: AnswerRequest): Promise<string>;
}

export interface AnswerParser {
  parse(markdown: string): Promise<DocumentBody>;
}
