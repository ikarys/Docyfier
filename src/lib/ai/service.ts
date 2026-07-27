import "server-only";
import { generateText, generateObject, jsonSchema, APICallError, type Schema } from "ai";
import type { JSONContent } from "@tiptap/core";
import {
  callOptions,
  callTimeoutMs,
  isTimeout,
  languageModel,
  llmBaseUrl,
  timeoutMessage,
} from "./provider";
import { getAiSettings } from "@/lib/settings";
import { validateDocJson } from "./doc-schema";
import { beautify } from "@/lib/doc/beautify";
import { parseOps, type DocOp } from "@/lib/doc/ops";
import {
  GENERATE_SYSTEM,
  TRANSFORM_OPS_SYSTEM,
  SELECTION_BLOCKS_SYSTEM,
  SELECTION_TEXT_SYSTEM,
  transformOpsPrompt,
  selectionBlocksPrompt,
  selectionTextPrompt,
  retryPrompt,
} from "./prompts";

/**
 * AI services behind the three editor surfaces. Every JSON-producing call is
 * validated against the editor schema and retried once with the validation
 * error before giving up.
 */

class AiUnavailableError extends Error {}

function timeoutError(): AiUnavailableError {
  return new AiUnavailableError(timeoutMessage());
}

async function complete(
  system: string,
  prompt: string,
  temperature: number,
): Promise<{ text: string; truncated: boolean }> {
  try {
    const model = await languageModel();
    const { maxOutputTokens } = await getAiSettings();
    const { text, finishReason } = await generateText({
      model,
      system,
      prompt,
      temperature,
      maxOutputTokens,
      ...callOptions(),
    });
    return { text, truncated: finishReason === "length" };
  } catch (err) {
    if (isTimeout(err)) {
      console.error("[ai] generateText timed out after", callTimeoutMs(), "ms");
      throw timeoutError();
    }
    if (APICallError.isInstance(err)) {
      // The provider's HTTP response didn't parse as the SDK's expected
      // schema (e.g. an HTML error page, an SSE chunk, or a non-OpenAI
      // envelope from a proxy) — log the raw body, it's the only way to see why.
      console.error(
        "[ai] APICallError from",
        err.url,
        "status",
        err.statusCode,
        "\nresponse body:",
        err.responseBody?.slice(0, 2000),
      );
    } else {
      console.error("[ai] generateText failed:", err);
    }
    if (
      err instanceof TypeError ||
      /fetch failed|ECONNREFUSED|ENOTFOUND|timeout/i.test(String(err))
    ) {
      throw new AiUnavailableError(
        `Cannot reach the AI server at ${await llmBaseUrl()}. Check Settings and make sure the server is running with a model loaded.`,
      );
    }
    throw err;
  }
}

/** Model output → JSON value (object or array), tolerating fences and prose. */
function extractJson(raw: string): unknown {
  let text = raw.trim();
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) text = fenced[1].trim();
  const firstObj = text.indexOf("{");
  const firstArr = text.indexOf("[");
  const isArray = firstArr !== -1 && (firstObj === -1 || firstArr < firstObj);
  const start = isArray ? firstArr : firstObj;
  const end = text.lastIndexOf(isArray ? "]" : "}");
  if (start === -1 || end <= start) {
    throw new Error("No JSON found in model output");
  }
  return JSON.parse(text.slice(start, end + 1));
}

interface LooseNode {
  type?: string;
  text?: string;
  marks?: { type?: string }[];
  content?: LooseNode[];
  [key: string]: unknown;
}

/**
 * Models sometimes leak markdown syntax into text nodes ("**bold**").
 * Convert **segments** into real bold marks and drop stray markers.
 * Code blocks are left untouched.
 */
function sanitizeMarkdownArtifacts(node: LooseNode): LooseNode {
  if (node.type === "codeBlock" || !Array.isArray(node.content)) return node;
  const content: LooseNode[] = [];
  for (const child of node.content) {
    if (child.type === "text" && typeof child.text === "string" && child.text.includes("**")) {
      const parts = child.text.split("**");
      if (parts.length % 2 === 1) {
        // Balanced markers: odd indexes were between ** pairs → bold.
        parts.forEach((part, i) => {
          if (!part) return;
          const marks = child.marks ? [...child.marks] : [];
          if (i % 2 === 1 && !marks.some((m) => m.type === "bold")) {
            marks.push({ type: "bold" });
          }
          content.push({ ...child, text: part, ...(marks.length ? { marks } : { marks: undefined }) });
        });
      } else {
        content.push({ ...child, text: parts.join("") });
      }
    } else {
      content.push(sanitizeMarkdownArtifacts(child));
    }
  }
  return { ...node, content };
}

/**
 * Models don't always honor the doc envelope: tolerate a bare block or an
 * array of blocks by wrapping them into a doc before validation.
 */
function normalizeToDoc(json: unknown): unknown {
  if (Array.isArray(json)) return { type: "doc", content: json };
  if (
    typeof json === "object" &&
    json !== null &&
    (json as { type?: unknown }).type !== "doc" &&
    typeof (json as { type?: unknown }).type === "string"
  ) {
    return { type: "doc", content: [json] };
  }
  return json;
}

/**
 * Deliberately permissive: it only pins the doc envelope, which is what models
 * get wrong when they answer with a fence or a bare block. Node shapes stay
 * free — `validateDocJson` is the real contract, and encoding the whole editor
 * schema here would be a second source of truth to keep in sync.
 */
const DOC_ENVELOPE = jsonSchema<{ type: string; content: unknown[] }>({
  type: "object",
  properties: {
    type: { type: "string", enum: ["doc"] },
    content: { type: "array", items: { type: "object" } },
  },
  required: ["type", "content"],
});

/**
 * One model answer as a JSON value. Uses the provider's JSON-schema mode when
 * the setting is on and a schema fits the surface; any failure there falls back
 * to the fence/prose-tolerant text path, so enabling the option can never make
 * a working provider stop working.
 */
async function produceJson(
  system: string,
  prompt: string,
  temperature: number,
  schema?: Schema<unknown>,
): Promise<unknown> {
  const { maxOutputTokens, structuredOutput } = await getAiSettings();
  if (schema && structuredOutput) {
    try {
      const { object } = await generateObject({
        model: await languageModel(),
        schema,
        system,
        prompt,
        temperature,
        maxOutputTokens,
        ...callOptions(),
      });
      return object;
    } catch (err) {
      // A deadline is not a reason to try the same endpoint again: falling
      // through here would spend the timeout a second time before failing.
      if (isTimeout(err)) throw timeoutError();
      console.error("[ai] structured output failed, using the text path:", err);
    }
  }

  const { text, truncated } = await complete(system, prompt, temperature);
  if (truncated) {
    // Retrying cannot help: the answer does not fit the output budget.
    throw new Error(
      "The document is too large for a whole-document edit — select the section to change and use the selection menu instead.",
    );
  }
  return extractJson(text);
}

/**
 * Ask for JSON and hand it to `parse`, retrying once with the parse error when
 * the model gets it wrong. Every JSON-producing surface goes through here, so
 * "invalid output → retry, never a broken editor" holds for documents, blocks
 * and op lists alike.
 */
async function completeJson<T>(
  system: string,
  prompt: string,
  temperature: number,
  parse: (json: unknown) => T,
  schema?: Schema<unknown>,
): Promise<T> {
  let lastError = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const input = attempt === 0 ? prompt : retryPrompt(prompt, lastError);
    const json = await produceJson(system, input, temperature, schema);
    try {
      return parse(json);
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }
  throw new Error(`The AI returned an invalid answer (${lastError})`);
}

function completeDoc(
  system: string,
  prompt: string,
  temperature: number,
): Promise<JSONContent> {
  return completeJson(
    system,
    prompt,
    temperature,
    (json) =>
      validateDocJson(sanitizeMarkdownArtifacts(normalizeToDoc(json) as LooseNode)),
    DOC_ENVELOPE,
  );
}

/**
 * Deterministic formatting pass over model output. Guarantees the structural
 * upgrades the model applies inconsistently; falls back to the raw doc if the
 * upgrade somehow produced schema-invalid JSON.
 */
function polish(doc: JSONContent): JSONContent {
  try {
    return validateDocJson(beautify(doc));
  } catch {
    return doc;
  }
}

/** Surface 1 — prompt-to-document. */
export async function generateDocument(prompt: string): Promise<JSONContent> {
  return polish(await completeDoc(GENERATE_SYSTEM, prompt, 0.7));
}

/**
 * Result of surface 2: normally a list of edits addressing individual blocks;
 * `doc` is the fallback for a model that answered with a whole document anyway.
 */
export type TransformOutcome =
  | { kind: "ops"; ops: DocOp[] }
  | { kind: "doc"; content: JSONContent };

/** Validate (and deterministically polish) the blocks each op carries. */
function validateOps(json: unknown, blockCount: number): DocOp[] {
  return parseOps(json, blockCount).map((op) => {
    if (op.op === "delete") return op;
    const wrapped = validateDocJson(
      sanitizeMarkdownArtifacts({ type: "doc", content: op.blocks } as LooseNode),
    );
    return { ...op, blocks: polish(wrapped).content ?? [] };
  });
}

/** An array of ops, or an array of blocks the model returned instead. */
function looksLikeOps(json: unknown[]): boolean {
  return json.every(
    (item) => typeof item === "object" && item !== null && "op" in item,
  );
}

/** Surface 2 — whole-document transform (side panel, "make it pretty"). */
export function transformDocument(
  doc: JSONContent,
  instruction: string,
): Promise<TransformOutcome> {
  const blocks = doc.content ?? [];
  return completeJson(
    TRANSFORM_OPS_SYSTEM,
    transformOpsPrompt(blocks, instruction),
    0.3,
    (json): TransformOutcome => {
      if (Array.isArray(json) && looksLikeOps(json)) {
        return { kind: "ops", ops: validateOps(json, blocks.length) };
      }
      // Model ignored the op contract and rewrote the document (or returned a
      // bare block array): fall back to the whole-document replacement.
      return {
        kind: "doc",
        content: polish(
          validateDocJson(
            sanitizeMarkdownArtifacts(normalizeToDoc(json) as LooseNode),
          ),
        ),
      };
    },
  );
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

/**
 * A model that was told to answer in plain text sometimes wraps the whole
 * answer in a fence anyway. Unwrap that, but only when the body holds no fence
 * of its own — a GitLab ticket legitimately contains fenced log blocks.
 */
function unwrapWholeAnswerFence(text: string): string {
  const fenced = text.match(/^```[a-zA-Z]*\n([\s\S]*)\n?```$/);
  const body = fenced?.[1];
  return body !== undefined && !body.includes("```") ? body.trim() : text;
}

/**
 * Surface 4 — the composers (PLAN.md STEP 8). Plain text in, plain text out:
 * these flows produce something to paste into another tool, not document JSON,
 * so none of the doc validation applies.
 */
export async function completePlainText(
  system: string,
  prompt: string,
  temperature: number,
): Promise<string> {
  const { text, truncated } = await complete(system, prompt, temperature);
  if (truncated) {
    throw new Error(
      "The answer hit the output limit — shorten the input, or raise the token budget in Settings → AI model.",
    );
  }
  return unwrapWholeAnswerFence(text.trim());
}

/** Surface 3b — inline selection rewrite; plain text in, plain text out. */
export async function rewriteSelectionText(
  text: string,
  instruction: string,
): Promise<string> {
  const { text: raw } = await complete(
    SELECTION_TEXT_SYSTEM,
    selectionTextPrompt(text, instruction),
    0.3,
  );
  return raw
    .trim()
    .replace(/^```[a-z]*\n?|```$/g, "")
    .replace(/^"|"$/g, "")
    .replace(/\*\*/g, "")
    .trim();
}
