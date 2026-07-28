import type { AnswerParser, AnswerWriter } from "@/domain/composing/answer-writer";
import type { Composer } from "@/domain/composing/composer";

/** What the composing use cases are handed: the flows this build ships, the
 * model behind them, and whatever turns its Markdown into a document. */
export interface ComposingDeps {
  composers: readonly Composer[];
  writer: AnswerWriter;
  parser: AnswerParser;
}
