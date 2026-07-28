import type { DocumentBody } from "@/domain/documents/body";
import { docToHtml } from "@/infrastructure/rendering/html";
import { docToJira } from "@/infrastructure/rendering/jira";
import { docToMarkdown } from "@/infrastructure/rendering/markdown";
import { docToText } from "@/infrastructure/rendering/text";
import type { ComposeFormat } from "@/domain/composing/clipboard-format";

/**
 * The last step of a composer: the edited document, in the markup its
 * destination reads (PLAN.md STEP 8).
 *
 * Pure and client-safe — the Copy button calls it on the text currently in the
 * editor, so nothing has to travel to the server to be converted.
 */
export function composePayload(
  format: ComposeFormat,
  doc: DocumentBody,
): { text: string; html?: string } {
  switch (format) {
    // A rich flavour for the destinations that accept one; the plain flavour
    // is what a mail client falls back to, so it must read on its own.
    case "html":
      return { text: docToText(doc), html: docToHtml(doc) };
    case "jira":
      return { text: docToJira(doc) };
    case "text":
      return { text: docToText(doc) };
    case "markdown":
      return { text: docToMarkdown(doc) };
  }
}
