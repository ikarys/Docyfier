import type { AuthoringDeps } from "@/application/authoring/deps";
import { StyleParameters } from "@/domain/authoring/style-parameters";
import type {
  GeneratedText,
  GenerationRequest,
  TextGenerator,
} from "@/domain/authoring/text-generator";
import type { DocumentBody } from "@/domain/documents/body";

/**
 * A model a test writes the answers of, plus a validator and a polisher it can
 * make fail on purpose. Nothing here reaches a network: what the use cases do
 * with an answer is the behaviour under test, not how the answer travelled.
 */

export class ScriptedGenerator implements TextGenerator {
  readonly requests: GenerationRequest[] = [];
  /** Set to answer through the provider's JSON mode instead of text. */
  jsonAnswers: unknown[] | null = null;

  constructor(private readonly answers: (string | GeneratedText)[]) {}

  async generate(request: GenerationRequest): Promise<GeneratedText> {
    this.requests.push(request);
    const answer = this.answers[this.requests.length - 1] ?? "";
    return typeof answer === "string" ? { text: answer, truncated: false } : answer;
  }

  async generateJson(request: GenerationRequest): Promise<unknown | null> {
    if (!this.jsonAnswers || request.shape !== "document") return null;
    this.requests.push(request);
    return this.jsonAnswers[this.requests.length - 1];
  }
}

/** Accepts any document with a `content` array — the editor schema itself is
 * proven where it lives, against the real extensions. */
export function permissiveValidator() {
  return {
    validate(json: unknown): DocumentBody {
      const body = json as DocumentBody;
      if (!body || body.type !== "doc" || !Array.isArray(body.content)) {
        throw new Error('Root node must be {"type": "doc", ...}');
      }
      return body;
    },
  };
}

export function authoringDeps(
  generator: TextGenerator,
  overrides: Partial<AuthoringDeps> = {},
): AuthoringDeps {
  return {
    generator,
    validator: permissiveValidator(),
    polisher: { polish: (body) => body },
    style: StyleParameters.defaults(),
    ...overrides,
  };
}
