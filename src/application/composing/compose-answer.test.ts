import { describe, expect, it } from "vitest";
import type { DocumentBody } from "@/domain/documents/body";
import type { AnswerRequest } from "@/domain/composing/answer-writer";
import type { Composer } from "@/domain/composing/composer";
import type { ComposingDeps } from "./deps";
import { availableComposer, composeAnswer } from "./compose-answer";

/**
 * Running one composer: refuse what the form did not fill in, build the prompt,
 * and hand the model's Markdown back as a document. The composer itself never
 * meets the model — that is the whole point of the port.
 */

const composer: Composer = {
  id: "email",
  label: "Email",
  description: "Write an email.",
  lede: "Describe what you want to say.",
  instructions: "The first line is the subject.",
  outputField: "input",
  clipboard: { default: "html" },
  fields: [
    { id: "input", label: "Your brief", type: "textarea", required: true },
    { id: "tone", label: "Tone", type: "select", default: "neutral", choices: [
      { value: "neutral", label: "Neutral" },
    ] },
  ],
  build: (values) => ({
    system: `Tone: ${values.tone}`,
    prompt: values.input,
    temperature: 0.2,
  }),
};

function deps(answer = "## Titre\n\ncorps"): ComposingDeps & { asked: AnswerRequest[] } {
  const asked: AnswerRequest[] = [];
  return {
    asked,
    composers: [composer],
    writer: {
      write: async (request) => {
        asked.push(request);
        return answer;
      },
    },
    parser: {
      parse: async (markdown): Promise<DocumentBody> => ({
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: markdown }] }],
      }),
    },
  };
}

describe("availableComposer", () => {
  it("hands out the composer as data, never its prompt builder", () => {
    const info = availableComposer(deps(), "email");

    expect(info?.id).toBe("email");
    expect(info).not.toHaveProperty("build");
  });

  it("returns nothing for an id this build does not ship, so the page can 404", () => {
    expect(availableComposer(deps(), "nope")).toBeNull();
  });
});

describe("composeAnswer", () => {
  const values = { input: "confirmer la date", tone: "neutral" };
  const context = { revising: false, guidance: "" };

  it("asks the model the prompt the composer built", async () => {
    const dependencies = deps();
    await composeAnswer(dependencies, "email", values, context);

    expect(dependencies.asked).toEqual([
      { system: "Tone: neutral", prompt: "confirmer la date", temperature: 0.2 },
    ]);
  });

  it("returns the answer as a document, since it is edited in a real editor", async () => {
    const outcome = await composeAnswer(deps("bonjour"), "email", values, context);

    expect(outcome).toEqual({
      ok: true,
      doc: {
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text: "bonjour" }] }],
      },
    });
  });

  it("names the empty field rather than sending an empty brief to the model", async () => {
    const dependencies = deps();
    const outcome = await composeAnswer(
      dependencies,
      "email",
      { input: "   ", tone: "neutral" },
      context,
    );

    expect(outcome).toEqual({ ok: false, error: "Your brief is required." });
    expect(dependencies.asked).toEqual([]);
  });

  it("refuses a composer this build does not ship", async () => {
    const outcome = await composeAnswer(deps(), "nope", values, context);

    expect(outcome).toEqual({ ok: false, error: "Unknown composer" });
  });

  it("falls back to a predictable temperature when the composer names none", async () => {
    const dependencies = deps();
    const plain: Composer = { ...composer, build: () => ({ system: "s", prompt: "p" }) };
    await composeAnswer(
      { ...dependencies, composers: [plain] },
      "email",
      values,
      context,
    );

    expect(dependencies.asked[0].temperature).toBe(0.4);
  });
});
