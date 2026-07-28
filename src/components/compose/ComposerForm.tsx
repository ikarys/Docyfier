"use client";

import { useActionState, useState } from "react";
import { composeAction } from "@/app/compose/actions";
import { CopyButton } from "@/components/CopyBox";
import { ComposeEditor, useComposeEditor } from "@/components/compose/ComposeEditor";
import { composePayload } from "@/lib/compose/clipboard";
import { clipboardFormat } from "@/domain/composing/clipboard-format";
import type { ComposerInfo } from "@/domain/composing/composer";
import {
  GUIDANCE_KEY,
  IMPROVE_INTENT,
  INTENT_KEY,
  REVISING_KEY,
} from "@/domain/composing/submission";
import { docToMarkdown } from "@/infrastructure/rendering/markdown";
import { ComposerField } from "./ComposerField";
import { useComposedAnswer } from "./useComposedAnswer";

/**
 * One composer: its fields, and the text they produce. The answer is written
 * back into the composer's output field instead of landing in a read-only box
 * below, so the user edits it and composes again on top of it. That field is a
 * small block editor, so the answer is read as a formatted document rather than
 * as the destination's raw markup — the markup is produced on copy.
 *
 * The other fields stay uncontrolled: they survive a run on their own, and
 * changing one before the next pass is the point. The exception is the select
 * that decides the clipboard format, whose value the Copy button needs.
 */
export function ComposerForm({ composer }: { composer: ComposerInfo }) {
  const [state, formAction, running] = useActionState(composeAction, null);
  const output = composer.fields.find((field) => field.id === composer.outputField);
  const editor = useComposeEditor(output?.placeholder ?? "");
  const answer = useComposedAnswer(editor, state);

  const decider = composer.clipboard.field;
  const [choice, setChoice] = useState(
    composer.fields.find((field) => field.id === decider)?.default ?? "",
  );

  return (
    <form
      className="settings-card"
      action={(form: FormData) => {
        if (!editor) return;
        const doc = editor.getJSON();
        // The editor is the output field: the model reads it as markdown, and
        // one markdown is all any composer's prompt asks for.
        form.set(composer.outputField, docToMarkdown(doc));
        answer.remember(doc);
        formAction(form);
      }}
    >
      <input type="hidden" name="composer" value={composer.id} />
      <input type="hidden" name={REVISING_KEY} value={answer.isAnswer ? "1" : "0"} />

      {composer.fields.map((field) =>
        field.id === composer.outputField ? (
          <div key={field.id} className="field compose-output">
            <span className="field-label">
              {field.label}
              {field.required && <span aria-hidden="true"> *</span>}
            </span>
            <ComposeEditor editor={editor} />
            {answer.isAnswer ? (
              <div className="compose-output-actions">
                <CopyButton
                  className="btn"
                  payload={() =>
                    composePayload(
                      clipboardFormat(composer.clipboard, { [decider ?? ""]: choice }),
                      editor?.getJSON() ?? { type: "doc", content: [] },
                    )
                  }
                />
                {answer.canRestore && (
                  <button className="btn btn-ghost" type="button" onClick={answer.restore}>
                    Restore my input
                  </button>
                )}
                <span className="field-help">{composer.instructions}</span>
              </div>
            ) : (
              field.help && <span className="field-help">{field.help}</span>
            )}
          </div>
        ) : (
          <ComposerField
            key={field.id}
            field={field}
            bound={
              field.id === decider ? { value: choice, onChange: setChoice } : undefined
            }
          />
        ),
      )}

      {answer.composed && (
        <label className="field">
          <span className="field-label">What to change</span>
          <textarea
            className="field-input compose-textarea"
            name={GUIDANCE_KEY}
            rows={3}
            placeholder="Shorter. Drop the apology. Add that the deadline is the 15th…"
            value={answer.guidance}
            onChange={(e) => answer.setGuidance(e.target.value)}
          />
          <span className="field-help">
            Used by <b>Improve</b>. <b>Compose again</b> ignores it and re-runs the
            settings above.
          </span>
        </label>
      )}

      <div className="settings-actions">
        {state?.error && <span className="field-error">{state.error}</span>}
        {answer.composed ? (
          <>
            <button
              className="btn"
              type="submit"
              name={INTENT_KEY}
              value="compose"
              disabled={running}
            >
              {running ? "Composing…" : "Compose again"}
            </button>
            <button
              className="btn btn-primary"
              type="submit"
              name={INTENT_KEY}
              value={IMPROVE_INTENT}
              disabled={running || !answer.guidance.trim()}
            >
              Improve
            </button>
          </>
        ) : (
          <button className="btn btn-primary" type="submit" disabled={running}>
            {running ? "Composing…" : "Compose"}
          </button>
        )}
      </div>
    </form>
  );
}
