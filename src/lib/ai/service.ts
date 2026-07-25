import "server-only";
import { generateText, APICallError } from "ai";
import type { JSONContent } from "@tiptap/core";
import { languageModel, llmBaseUrl } from "./provider";
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
    });
    return { text, truncated: finishReason === "length" };
  } catch (err) {
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
): Promise<T> {
  let lastError = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const input = attempt === 0 ? prompt : retryPrompt(prompt, lastError);
    const { text: raw, truncated } = await complete(system, input, temperature);
    if (truncated) {
      // Retrying cannot help: the answer does not fit the output budget.
      throw new Error(
        "The document is too large for a whole-document edit — select the section to change and use the selection menu instead.",
      );
    }
    try {
      return parse(extractJson(raw));
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
  return completeJson(system, prompt, temperature, (json) =>
    validateDocJson(sanitizeMarkdownArtifacts(normalizeToDoc(json) as LooseNode)),
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
