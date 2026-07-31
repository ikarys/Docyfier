import "server-only";
import type { TextStreamPart, ToolSet } from "ai";
import { beautify } from "@/domain/authoring/beautify";
import { parseModelJson } from "@/domain/authoring/model-answer";
import type { StyleParameters } from "@/domain/authoring/style-parameters";
import type { DocumentNode } from "@/domain/documents/body";
import { validateDocJson } from "@/infrastructure/editor/schema";
import type { AnswerSize } from "@/infrastructure/authoring/openai-compatible/usage-log";
import { providerMessage as message } from "./ndjson";
import { BlockScanner } from "./stream-blocks";

/**
 * Reading a model answer as it is written: the part of a block stream that
 * knows what a block is, kept apart from the part that knows what an HTTP
 * response is.
 */

export type Part = TextStreamPart<ToolSet>;

/** Everything one answer turned out to be, filled in as it is read. */
export interface Read {
  /** Why the answer ended badly, or null when it ended. */
  stopped: string | null;
  written: DocumentNode[];
  blocks: number;
  skipped: number;
  /** What was read off the stream, so the wait can be told apart from the answer. */
  answer: AnswerSize;
  usage: unknown;
}

export function emptyRead(): Read {
  return {
    stopped: null,
    written: [],
    blocks: 0,
    skipped: 0,
    answer: { chars: 0, thinking: 0 },
    usage: null,
  };
}

/**
 * One block through the same pipeline as the non-streaming path: schema
 * validation, then the deterministic formatter. Both rules `beautify` applies
 * are block-local, so a single-block document is a faithful wrapper.
 */
function prepare(raw: string, style: StyleParameters): unknown {
  const doc = validateDocJson({ type: "doc", content: [parseModelJson(raw)] });
  const polished = beautify(doc, style);
  return (validateDocJson(polished).content ?? [])[0];
}

/**
 * Read the answer to its end, handing each accepted block over as it closes.
 *
 * Filling a `Read` the caller owns rather than returning one: a stream that
 * throws halfway still spent whatever it spent, and the log is the only place
 * that says so.
 */
export async function readAnswer(
  source: { parts: AsyncIterator<Part>; firstText: string },
  style: StyleParameters,
  send: (block: unknown) => void,
  read: Read,
): Promise<void> {
  const scanner = new BlockScanner();

  const emit = (raw: string) => {
    try {
      const block = prepare(raw, style);
      send(block);
      read.written.push(block as DocumentNode);
      read.blocks++;
    } catch (err) {
      // A block the schema rejects is dropped rather than aborting the answer;
      // the count is reported in the terminal line.
      console.error("[ai] streamed block rejected:", message(err));
      read.skipped++;
    }
  };

  read.answer.chars += source.firstText.length;
  for (const raw of scanner.push(source.firstText)) emit(raw);

  while (!scanner.finished) {
    const next = await source.parts.next();
    if (next.done) break;
    if (next.value.type === "text-delta") {
      read.answer.chars += next.value.text.length;
      for (const raw of scanner.push(next.value.text)) emit(raw);
    } else if (next.value.type === "reasoning-delta") {
      // Nothing downstream wants the thinking, but its size is the difference
      // between a model that was slow and a model that was deliberating.
      read.answer.thinking += next.value.text.length;
    } else if (next.value.type === "error") {
      read.stopped = message(next.value.error);
      break;
    } else if (next.value.type === "finish") {
      read.usage = next.value.totalUsage;
      if (next.value.finishReason === "length") {
        read.stopped = "The answer was cut short — raise Max output tokens in Settings.";
      }
    }
  }
}
