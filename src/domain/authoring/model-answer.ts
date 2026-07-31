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
