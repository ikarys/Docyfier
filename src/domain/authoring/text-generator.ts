import type { DocumentBody, DocumentNode } from "@/domain/documents/body";

/**
 * The model behind the AI surfaces — the port, not a provider.
 *
 * Which endpoint answers, how it is authenticated, how long it is given and how
 * its failures read are infrastructure concerns. What the use cases need is
 * narrower: ask for text, and learn whether the answer was cut short.
 *
 * There is no "ask for JSON" any more. A provider's JSON mode only ever fitted
 * the document shape, and since STEP U14 a document is not JSON — so the mode
 * had nothing left to describe.
 */

/**
 * How much thinking a request is worth, for a model that thinks before it
 * writes. Reshaping one paragraph is not the same job as planning a report, and
 * a model given the same budget for both spends the difference in the user's
 * wait. Only the endpoint knows whether its model can be told; what a use case
 * knows is which of its surfaces are mechanical.
 */
export type ThinkingEffort = "low" | "medium" | "high";

export interface GenerationRequest {
  system: string;
  prompt: string;
  /** 0 for a faithful rewrite, higher for a document written from scratch. */
  temperature: number;
  /** Absent means "whatever this model does by default". */
  effort?: ThinkingEffort;
  /**
   * The most this answer may cost, over and above what the provider allows.
   * A reasoning model deliberates to the budget it is handed, so a call about
   * one block asks for one block's worth.
   */
  maxTokens?: number;
}

export interface GeneratedText {
  text: string;
  /** The model hit its output ceiling: retrying the same request cannot help. */
  truncated: boolean;
}

export interface TextGenerator {
  generate(request: GenerationRequest): Promise<GeneratedText>;
}

/** The model could not be reached, or did not answer in time. Carries the
 * wording the user reads, because only the adapter knows which endpoint failed. */
export class ModelUnavailable extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ModelUnavailable";
  }
}

/**
 * The answer hit the output ceiling. Distinct from any other bad answer because
 * asking again produces the same truncation: what has to change is the size of
 * the request, which only the user can do.
 */
export class AnswerTruncated extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AnswerTruncated";
  }
}

/**
 * Proof that a body is one the editor can render — the port over the editor
 * schema. Implementations throw with a description a retry prompt can quote.
 */
export interface BodyValidator {
  validate(json: unknown): DocumentBody;
}

/**
 * The deterministic formatting pass applied to model output: the structural
 * upgrades a model applies inconsistently, applied every time.
 */
export interface BodyPolisher {
  polish(body: DocumentBody): DocumentBody;
}

/**
 * What a model wrote → the blocks it describes.
 *
 * Which format that is belongs to an adapter, not to a use case: STEP U14 moved
 * it from ProseMirror JSON to markdown with `:::` directives, and not one use
 * case had to know. Reading is total — an answer that says nothing gives back
 * no blocks — because whether the result is usable is `BodyValidator`'s ruling,
 * and it is the one whose complaint a retry can quote.
 */
export interface BodyReader {
  read(text: string): DocumentNode[];
}

/**
 * Blocks → what the model is shown of them.
 *
 * The other half of `BodyReader`, and the half that was measured: a document
 * handed to a model as ProseMirror JSON costs 4.94x the words it contains, and
 * the model pays that on the way in as surely as on the way out.
 */
export interface BodyWriter {
  write(blocks: DocumentNode[]): string;
}
