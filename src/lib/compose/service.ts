import "server-only";
import {
  availableComposer as readComposer,
  composeAnswer,
  type ComposeOutcome,
} from "@/application/composing/compose-answer";
import type { ComposingDeps } from "@/application/composing/deps";
import type {
  ComposeContext,
  ComposerInfo,
  ComposerValues,
} from "@/domain/composing/composer";
import { completePlainText } from "@/lib/ai/service";
import { docFromMarkdown } from "@/lib/import";
import { toPlainJSON } from "@/infrastructure/documents/editor-body";
import { COMPOSERS } from "./registry";

/**
 * Composition root for the composers: the flows on one side, the model and the
 * markdown reader on the other. Nothing below this line knows which model
 * answers, or that Markdown is what it answers with.
 */

export type { ComposeOutcome };

function deps(): ComposingDeps {
  return {
    composers: COMPOSERS,
    writer: {
      write: ({ system, prompt, temperature }) =>
        completePlainText(system, prompt, temperature),
    },
    parser: {
      parse: async (markdown) => toPlainJSON(await docFromMarkdown(markdown)),
    },
  };
}

/** One composer as plain data, or `null` when the id is unknown. */
export function availableComposer(composerId: string): ComposerInfo | null {
  return readComposer(deps(), composerId);
}

/** Run one composer over its submitted values. */
export function compose(
  composerId: string,
  values: ComposerValues,
  context: ComposeContext = { revising: false, guidance: "" },
): Promise<ComposeOutcome> {
  return composeAnswer(deps(), composerId, values, context);
}
