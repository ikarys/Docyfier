import { fragmentFromAnswer } from "@/domain/authoring/model-answer";
import {
  CARET_CONTINUE_SYSTEM,
  caretContinuePrompt,
  caretPrompt,
  caretSystem,
} from "@/domain/authoring/prompts";
import type { DocumentNode } from "@/domain/documents/body";
import { effortFor } from "@/domain/authoring/thinking";
import { askDocument } from "./ask-model";
import type { AuthoringDeps } from "./deps";

/**
 * Surface 5 — the two things the model can do where the caret is (PLAN.md
 * STEP U11): write what was asked for, and finish what was started.
 *
 * Both take the document's digest rather than the document: the cost of a
 * whole-document call to add one paragraph is what kept this surface from
 * existing.
 */

export interface CaretContext {
  /** What the document is about — `digestOf`, never the whole document. */
  readonly digest: string;
  /** The text of the block the caret sits in; empty in an empty document. */
  readonly here: string;
}

/** Blocks to insert at the caret, and nothing else. */
export async function writeAtCaret(
  deps: AuthoringDeps,
  context: CaretContext,
  instruction: string,
): Promise<DocumentNode[]> {
  const body = await askDocument(deps, {
    system: caretSystem(deps.style),
    prompt: caretPrompt(context.digest, context.here, instruction),
    temperature: 0.6,
    effort: effortFor("block"),
  });
  return body.content ?? [];
}

/**
 * The rest of the sentence, as bare text: it lands mid-paragraph, so a fence or
 * a pair of quotes would go into the document as characters.
 *
 * A model that answers by repeating the words it was given has offered nothing,
 * and so has one that answers with what is already there — both come back null
 * rather than as a suggestion the writer has to read to reject.
 */
export async function continueWriting(
  deps: AuthoringDeps,
  context: CaretContext,
): Promise<string | null> {
  const answer = await deps.generator.generate({
    system: CARET_CONTINUE_SYSTEM,
    prompt: caretContinuePrompt(context.digest, context.here),
    temperature: 0.6,
    // Offered as ghost text while the writer keeps typing: an answer that
    // arrives after the next word is an answer nobody will read.
    effort: effortFor("block"),
  });
  return newWords(fragmentFromAnswer(answer.text), context.here);
}

/** What the answer adds to `here`, once the repeated head is taken off it. */
function newWords(answer: string, here: string): string | null {
  const tail = here.trimEnd();
  const added = answer.startsWith(tail) ? answer.slice(tail.length) : answer;
  const trimmed = added.trim();
  return trimmed === "" ? null : trimmed;
}
