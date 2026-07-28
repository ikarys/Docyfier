import type { DocumentNode } from "@/domain/documents/body";

/**
 * Reading what a model actually answered.
 *
 * A language model is asked for JSON and answers with a fence, with an apology
 * in front of it, with a bare block instead of a document, or with `**bold**`
 * left as literal text. None of that is the editor's problem and none of it is
 * the provider's: it is knowledge about model output, it belongs here, and it is
 * what stands between one retry and a broken document.
 */

/**
 * A trailing comma is the one malformation models produce often enough to be
 * worth repairing rather than spending a retry on — `{"a":1,}` costs the whole
 * document otherwise. Commas inside strings are left alone, which is why this
 * tracks string and escape state instead of running a regex over the text.
 */
function withoutTrailingCommas(json: string): string {
  let out = "";
  let inString = false;
  let escaped = false;

  for (let i = 0; i < json.length; i++) {
    const char = json[i];
    if (inString) {
      out += char;
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    if (char === ",") {
      const next = json.slice(i + 1).match(/^\s*([}\]])/);
      if (next) continue;
    }
    out += char;
  }
  return out;
}

/** Model JSON, with the malformation models actually produce forgiven. */
export function parseModelJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch (err) {
    try {
      return JSON.parse(withoutTrailingCommas(text));
    } catch {
      // The repair changed nothing that mattered: report the original fault.
      throw err;
    }
  }
}

/** The JSON value inside a model answer, fences and prose included. */
export function jsonFromAnswer(raw: string): unknown {
  let text = raw.trim();
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) text = fenced[1].trim();

  const firstObject = text.indexOf("{");
  const firstArray = text.indexOf("[");
  const isArray = firstArray !== -1 && (firstObject === -1 || firstArray < firstObject);
  const start = isArray ? firstArray : firstObject;
  const end = text.lastIndexOf(isArray ? "]" : "}");
  if (start === -1 || end <= start) {
    throw new Error("No JSON found in model output");
  }
  return parseModelJson(text.slice(start, end + 1));
}

/**
 * The document envelope models do not always honour: a bare block or an array
 * of blocks becomes the document it was meant to be.
 */
export function wrapInDoc(json: unknown): unknown {
  if (Array.isArray(json)) return { type: "doc", content: json };
  const node = json as { type?: unknown } | null;
  if (typeof json === "object" && json !== null && typeof node?.type === "string") {
    return node.type === "doc" ? json : { type: "doc", content: [json] };
  }
  return json;
}

/**
 * Markdown emphasis leaked into text nodes, turned into the mark it meant.
 * Balanced `**` pairs become bold; a stray marker is dropped rather than shown.
 * Code blocks keep every character: `**` is code there.
 */
export function boldFromMarkdown(node: DocumentNode): DocumentNode {
  if (node.type === "codeBlock" || !Array.isArray(node.content)) return node;

  const content: DocumentNode[] = [];
  for (const child of node.content) {
    if (child.type !== "text" || !child.text?.includes("**")) {
      content.push(boldFromMarkdown(child));
      continue;
    }
    content.push(...splitOnMarkers(child));
  }
  return { ...node, content };
}

function splitOnMarkers(child: DocumentNode): DocumentNode[] {
  const parts = (child.text as string).split("**");
  // An even number of markers leaves an odd number of parts: those are pairs.
  if (parts.length % 2 === 0) return [{ ...child, text: parts.join("") }];

  const pieces: DocumentNode[] = [];
  parts.forEach((part, index) => {
    if (!part) return;
    const marks = child.marks ? [...child.marks] : [];
    if (index % 2 === 1 && !marks.some((mark) => mark.type === "bold")) {
      marks.push({ type: "bold" });
    }
    pieces.push({ ...child, text: part, marks: marks.length ? marks : undefined });
  });
  return pieces;
}

/**
 * A rewritten fragment, ready to drop back mid-sentence.
 *
 * Stricter than a whole answer: this text replaces a few words inside a
 * paragraph, so a fence, the quotes a model puts around a rewrite and leftover
 * emphasis markers would all land in the document as characters.
 */
export function fragmentFromAnswer(raw: string): string {
  return raw
    .trim()
    .replace(/^```[a-zA-Z]*\n?/, "")
    .replace(/```$/, "")
    .trim()
    .replace(/^"|"$/g, "")
    .replace(/\*\*/g, "")
    .trim();
}

/**
 * A plain-text answer a model fenced anyway. Only the whole-answer fence goes:
 * a ticket description legitimately carries fenced logs of its own.
 */
export function plainFromAnswer(text: string): string {
  const fenced = text.match(/^```[a-zA-Z]*\n([\s\S]*)\n?```$/);
  const body = fenced?.[1];
  return body !== undefined && !body.includes("```") ? body.trim() : text;
}
