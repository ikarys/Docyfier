import type { DocumentBody } from "@/domain/documents/body";

/**
 * The model behind the AI surfaces — the port, not a provider.
 *
 * Which endpoint answers, how it is authenticated, how long it is given and how
 * its failures read are infrastructure concerns. What the use cases need is
 * narrower: ask for text, learn whether the answer was cut short, and — when
 * the endpoint supports it — ask for JSON directly.
 */

/**
 * What the answer is expected to be. Only a whole document has a shape a
 * provider's JSON mode can be told about; an op list or a fragment is asked for
 * in the prompt alone.
 */
export type AnswerShape = "document" | "free";

export interface GenerationRequest {
  system: string;
  prompt: string;
  /** 0 for a faithful rewrite, higher for a document written from scratch. */
  temperature: number;
  shape: AnswerShape;
}

export interface GeneratedText {
  text: string;
  /** The model hit its output ceiling: retrying the same request cannot help. */
  truncated: boolean;
}

export interface TextGenerator {
  generate(request: GenerationRequest): Promise<GeneratedText>;
  /**
   * The same request in the provider's JSON mode. Answers `null` when this
   * endpoint has no such mode, or when the shape asked for does not fit one —
   * the caller then reads JSON out of the text instead.
   */
  generateJson(request: GenerationRequest): Promise<unknown | null>;
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
