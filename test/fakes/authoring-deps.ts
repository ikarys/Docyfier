import type { AuthoringDeps } from "@/application/authoring/deps";
import { StyleParameters } from "@/domain/authoring/style-parameters";
import type {
  GeneratedText,
  GenerationRequest,
  TextGenerator,
} from "@/domain/authoring/text-generator";
import type { DocumentBody } from "@/domain/documents/body";
import {
  blocksToModelMarkdown,
  modelMarkdownToBlocks,
} from "@/infrastructure/rendering/model-markdown";

/**
 * A model a test writes the answers of, plus a validator and a polisher it can
 * make fail on purpose. Nothing here reaches a network: what the use cases do
 * with an answer is the behaviour under test, not how the answer travelled.
 */

export class ScriptedGenerator implements TextGenerator {
  readonly requests: GenerationRequest[] = [];

  constructor(private readonly answers: (string | GeneratedText)[]) {}

  async generate(request: GenerationRequest): Promise<GeneratedText> {
    this.requests.push(request);
    const answer = this.answers[this.requests.length - 1] ?? "";
    return typeof answer === "string" ? { text: answer, truncated: false } : answer;
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
    // The real format, not a stub: a use case that mangles what it sends the
    // model, or reads its answer wrongly, is exactly what these tests are for.
    reader: { read: modelMarkdownToBlocks },
    writer: { write: blocksToModelMarkdown },
    validator: permissiveValidator(),
    polisher: { polish: (body) => body },
    style: StyleParameters.defaults(),
    ...overrides,
  };
}
