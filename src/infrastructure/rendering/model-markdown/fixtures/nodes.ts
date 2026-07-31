import type { DocumentMark, DocumentNode } from "@/domain/documents/body";

/**
 * The shorthand every fixture file is written in, and the shape of a case.
 *
 * A fixture deliberately sets attributes away from their default: one left
 * alone is one the round trip could drop without the test noticing.
 */

export interface RoundTripCase {
  readonly name: string;
  readonly blocks: DocumentNode[];
}

export const text = (value: string): DocumentNode => ({ type: "text", text: value });

export const para = (value: string): DocumentNode => ({
  type: "paragraph",
  content: [text(value)],
});

export const heading = (level: number, value: string): DocumentNode => ({
  type: "heading",
  attrs: { level },
  content: [text(value)],
});

export const marked = (value: string, ...marks: DocumentMark[]): DocumentNode => ({
  type: "text",
  text: value,
  marks,
});
