import type { DocOp } from "@/domain/authoring/ops";
import type { DocumentBody } from "@/domain/documents/body";
import { providerMessage } from "./ndjson";
import type { StreamEvent } from "./stream-heartbeat";
import { JsonArrayScanner, firstArray } from "./stream-json";

/**
 * Surface 2, streaming — a whole-document edit read as it is written.
 *
 * The blocking version sends nothing until the model is done, which on a long
 * document outlasts the reverse proxy in front of the app: the browser reads an
 * error page instead of the edit. Here each operation leaves for the editor the
 * moment it closes, and a beat goes out while the model is still thinking.
 *
 * Pure: the parts come in, the NDJSON records go out, and what an operation
 * must satisfy is the reader's business — which is what makes this testable
 * without a model.
 */

/** The parts of a model stream this reader looks at. */
export interface ModelPart {
  type: string;
  text?: string;
  error?: unknown;
  finishReason?: string;
  /** What the call cost, on the part that closes it. */
  totalUsage?: unknown;
}

/** Turns raw model output into what the editor is allowed to apply. */
export interface TransformReader {
  /** One raw operation object → the validated, polished operation. */
  op(raw: unknown): DocOp;
  /** The whole answer, for a model that returned a document instead. */
  doc(text: string): DocumentBody;
}

const STALLED =
  "The AI server went quiet before it finished the edit. It may be overloaded — try again, or ask for a smaller change.";
const TRUNCATED =
  "The edit was cut short — raise Max output tokens in Settings, or ask for a smaller change.";

/** `[` opens a list of operations, `{` a document; nothing else decides. */
function shapeOf(text: string): "ops" | "doc" | "unknown" {
  for (const char of text) {
    if (char === "[") return "ops";
    if (char === "{") return "doc";
  }
  return "unknown";
}

export async function* transformLines(
  events: AsyncGenerator<StreamEvent<ModelPart>>,
  reader: TransformReader,
): AsyncGenerator<Record<string, unknown>> {
  const scanner = new JsonArrayScanner(firstArray());
  let text = "";
  let scanned = 0;
  let shape: "ops" | "doc" | "unknown" = "unknown";
  let ops = 0;
  let skipped = 0;
  let failure: string | null = null;

  for await (const event of events) {
    if (event.kind === "beat") {
      yield { beat: true };
      continue;
    }
    if (event.kind === "stalled") {
      failure = STALLED;
      break;
    }

    const part = event.part;
    if (part.type === "error") {
      failure = providerMessage(part.error);
      break;
    }
    if (part.type === "finish" && part.finishReason === "length") {
      failure = TRUNCATED;
      continue;
    }
    if (part.type !== "text-delta" || typeof part.text !== "string") continue;

    text += part.text;
    if (shape === "unknown") shape = shapeOf(text);
    if (shape !== "ops") continue;

    for (const raw of scanner.push(text.slice(scanned))) {
      try {
        yield { op: reader.op(JSON.parse(raw)) };
        ops++;
      } catch (err) {
        // One operation the document cannot accept is not a reason to lose the
        // ones that were fine; the count travels in the terminal line.
        console.error("[ai] streamed op rejected:", providerMessage(err));
        skipped++;
      }
    }
    scanned = text.length;
  }

  if (!failure && shape === "doc") {
    try {
      yield { doc: reader.doc(text) };
    } catch (err) {
      failure = providerMessage(err);
    }
  }

  yield failure ? { error: failure, ops } : { done: true, ops, skipped };
}
