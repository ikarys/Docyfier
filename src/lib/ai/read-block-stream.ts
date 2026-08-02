import "server-only";
import type { TextStreamPart, ToolSet } from "ai";
import { beautify } from "@/domain/authoring/beautify";
import type { StyleParameters } from "@/domain/authoring/style-parameters";
import type { DocumentNode } from "@/domain/documents/body";
import { validateDocJson } from "@/infrastructure/editor/schema";
import type { AnswerSize } from "@/infrastructure/authoring/openai-compatible/usage-log";
import { providerMessage as message } from "./ndjson";
import { BlockSplitter } from "@/infrastructure/rendering/model-markdown/split-blocks";
import { modelMarkdownToBlocks } from "@/infrastructure/rendering/model-markdown";
import type { TextGenerator } from "@/domain/authoring/text-generator";
import { effortFor, tokensFor } from "@/domain/authoring/thinking";

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
  /** What the schema rejected and why, kept for one repair attempt each. */
  retriable: { raw: string; error: string }[];
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
    retriable: [],
    answer: { chars: 0, thinking: 0 },
    usage: null,
  };
}

/**
 * One block through the same pipeline as the non-streaming path: schema
 * validation, then the deterministic formatter. Both rules `beautify` applies
 * are block-local, so a single-block document is a faithful wrapper.
 */
export function prepare(raw: string, style: StyleParameters): unknown {
  const doc = validateDocJson({ type: "doc", content: modelMarkdownToBlocks(raw) });
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
  const splitter = new BlockSplitter();

  const emit = (raw: string) => {
    try {
      const block = prepare(raw, style);
      send(block);
      read.written.push(block as DocumentNode);
      read.blocks++;
    } catch (err) {
      // Kept for one repair attempt (`repairFailedBlocks`) rather than dropped
      // outright: the schema already names what is wrong, which is what a
      // retry needs and a silent drop throws away.
      console.error("[ai] streamed block rejected:", message(err));
      read.retriable.push({ raw, error: message(err) });
    }
  };

  read.answer.chars += source.firstText.length;
  for (const raw of splitter.push(source.firstText)) emit(raw);

  for (;;) {
    const next = await source.parts.next();
    if (next.done) break;
    if (next.value.type === "text-delta") {
      read.answer.chars += next.value.text.length;
      for (const raw of splitter.push(next.value.text)) emit(raw);
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

  // No closing bracket says the answer is over any more: the last block is
  // whatever the writing stopped in the middle of, and it is still a block.
  for (const raw of splitter.end()) emit(raw);
}

interface RepairContext {
  system: string;
  prompt: string;
  temperature: number;
}

/**
 * One bounded second chance for a block the schema rejected. `diagramError`
 * (and every other block validator) already names the offending node or
 * edge, so the model is handed the exact reason rather than asked to guess
 * again from scratch.
 */
async function repairBlock(
  generator: TextGenerator,
  request: RepairContext,
  raw: string,
  error: string,
): Promise<string | null> {
  const prompt = `${request.prompt}\n\nYour previous answer for one block was rejected: ${error}\nWhat you wrote:\n${raw}\n\nWrite ONLY a corrected replacement for that one block, in the same format.`;
  try {
    const { text, truncated } = await generator.generate({
      system: request.system,
      prompt,
      temperature: request.temperature,
      effort: effortFor("block"),
      maxTokens: tokensFor("block"),
    });
    return truncated ? null : text;
  } catch {
    return null;
  }
}

/**
 * Every block the stream dropped gets one repair attempt, in order, after
 * the stream itself has finished — never during it, so a block still
 * landing live is never delayed by one that already failed. A block that
 * fails twice stays dropped: no further retry.
 */
export async function repairFailedBlocks(
  generator: TextGenerator,
  request: RepairContext,
  read: Read,
  style: StyleParameters,
  send: (block: unknown) => void,
): Promise<void> {
  const retriable = read.retriable;
  read.retriable = [];
  for (const { raw, error } of retriable) {
    const fixed = await repairBlock(generator, request, raw, error);
    if (fixed === null) {
      read.skipped++;
      continue;
    }
    try {
      const block = prepare(fixed, style);
      send(block);
      read.written.push(block as DocumentNode);
      read.blocks++;
    } catch (err) {
      console.error("[ai] repaired block still rejected:", message(err));
      read.skipped++;
    }
  }
}
