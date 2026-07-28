import type { DocumentBody } from "@/domain/documents/body";

/**
 * Document templates (PLAN.md STEP U5) — a starting point that already looks
 * like a finished document, so a new document is three clicks away.
 *
 * A template is content, not behaviour: its body is a document body like any
 * other, validated against the editor schema at build time by
 * `src/lib/templates-check.ts`, so a broken template can never reach a user.
 *
 * Client-safe: the gallery renders the metadata, the server action reads the
 * content. Thumbnails are declarative block shapes (`thumb`), never a live
 * editor render.
 */

/** The block shapes a thumbnail can draw — see `.tpl-thumb` in globals.css. */
export type ThumbBlock =
  | "cover"
  | "title"
  | "text"
  | "stats"
  | "cards"
  | "table"
  | "timeline"
  | "steps"
  | "chart"
  | "callout";

export interface Template {
  id: string;
  label: string;
  description: string;
  /** Theme preset the document starts with (see src/lib/themes.ts). */
  preset: string;
  thumb: ThumbBlock[];
  content: DocumentBody;
}
