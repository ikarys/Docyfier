import "server-only";
import { generateText } from "ai";
import type { JSONContent } from "@tiptap/core";
import { languageModel, llmBaseUrl } from "./provider";
import { validateDocJson } from "./doc-schema";
import {
  GENERATE_SYSTEM,
  TRANSFORM_SYSTEM,
  SELECTION_BLOCKS_SYSTEM,
  SELECTION_TEXT_SYSTEM,
  transformPrompt,
  selectionBlocksPrompt,
  selectionTextPrompt,
  retryPrompt,
} from "./prompts";

/**
 * AI services behind the three editor surfaces. Every JSON-producing call is
 * validated against the editor schema and retried once with the validation
 * error before giving up.
 */

const MAX_OUTPUT_TOKENS = 8192;

class AiUnavailableError extends Error {}

async function complete(
  system: string,
  prompt: string,
  temperature: number,
): Promise<string> {
  try {
    const model = await languageModel();
    const { text } = await generateText({
      model,
      system,
      prompt,
      temperature,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
    });
    return text;
  } catch (err) {
    if (
      err instanceof TypeError ||
      /fetch failed|ECONNREFUSED|ENOTFOUND/i.test(String(err))
    ) {
      throw new AiUnavailableError(
        `Cannot reach the AI server at ${llmBaseUrl()}. Is LM Studio running with a model loaded?`,
      );
    }
    throw err;
  }
}

/** Model output → JSON object, tolerating fences and surrounding prose. */
function extractJson(raw: string): unknown {
  let text = raw.trim();
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) text = fenced[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) {
    throw new Error("No JSON object found in model output");
  }
  return JSON.parse(text.slice(start, end + 1));
}

async function completeDoc(
  system: string,
  prompt: string,
  temperature: number,
): Promise<JSONContent> {
  let lastError = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const input = attempt === 0 ? prompt : retryPrompt(prompt, lastError);
    const raw = await complete(system, input, temperature);
    try {
      return validateDocJson(extractJson(raw));
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }
  throw new Error(`The AI returned an invalid document (${lastError})`);
}

/** Surface 1 — prompt-to-document. */
export async function generateDocument(prompt: string): Promise<JSONContent> {
  return completeDoc(GENERATE_SYSTEM, prompt, 0.7);
}

/** Surface 2 — whole-document transform (side panel, "make it pretty"). */
export async function transformDocument(
  doc: JSONContent,
  instruction: string,
): Promise<JSONContent> {
  return completeDoc(TRANSFORM_SYSTEM, transformPrompt(doc, instruction), 0.3);
}

/** Surface 3a — multi-block selection rewrite; returns replacement blocks. */
export async function rewriteSelectionBlocks(
  blocks: JSONContent[],
  instruction: string,
): Promise<JSONContent[]> {
  const doc = await completeDoc(
    SELECTION_BLOCKS_SYSTEM,
    selectionBlocksPrompt(blocks, instruction),
    0.3,
  );
  return doc.content ?? [];
}

/** Surface 3b — inline selection rewrite; plain text in, plain text out. */
export async function rewriteSelectionText(
  text: string,
  instruction: string,
): Promise<string> {
  const raw = await complete(
    SELECTION_TEXT_SYSTEM,
    selectionTextPrompt(text, instruction),
    0.3,
  );
  return raw
    .trim()
    .replace(/^```[a-z]*\n?|```$/g, "")
    .replace(/^"|"$/g, "")
    .trim();
}
