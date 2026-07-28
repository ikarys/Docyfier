"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { JSONContent } from "@tiptap/core";
import { composeAction, type ComposeState } from "@/app/compose/actions";
import { CopyButton } from "@/components/CopyBox";
import { ComposeEditor, useComposeEditor } from "@/components/compose/ComposeEditor";
import { composePayload } from "@/lib/compose/clipboard";
import { clipboardFormat } from "@/domain/composing/clipboard-format";
import type { ComposerField, ComposerInfo } from "@/domain/composing/composer";
import {
  GUIDANCE_KEY,
  IMPROVE_INTENT,
  INTENT_KEY,
  REVISING_KEY,
} from "@/domain/composing/submission";
import { docToMarkdown } from "@/infrastructure/rendering/markdown";

/** A field whose value the form drives, rather than the DOM. */
interface Bound {
  value: string;
  onChange: (value: string) => void;
}

/** One declared field, rendered as the input its type calls for. */
function Field({ field, bound }: { field: ComposerField; bound?: Bound }) {
  const label = (
    <span className="field-label">
      {field.label}
      {field.required && <span aria-hidden="true"> *</span>}
    </span>
  );

  if (field.type === "select") {
    return (
      <label className="field">
        {label}
        <select
          className="field-input"
          name={field.id}
          {...(bound
            ? { value: bound.value, onChange: (e) => bound.onChange(e.target.value) }
            : { defaultValue: field.default })}
        >
          {field.choices?.map((choice) => (
            <option key={choice.value} value={choice.value}>
              {choice.label}
            </option>
          ))}
        </select>
        {field.help && <span className="field-help">{field.help}</span>}
      </label>
    );
  }

  return (
    <label className="field">
      {label}
      {field.type === "textarea" ? (
        <textarea
          className="field-input compose-textarea"
          name={field.id}
          rows={field.rows ?? 8}
          placeholder={field.placeholder}
          required={field.required}
          defaultValue={field.default}
        />
      ) : (
        <input
          className="field-input"
          type="text"
          name={field.id}
          placeholder={field.placeholder}
          defaultValue={field.default}
          required={field.required}
        />
      )}
      {field.help && <span className="field-help">{field.help}</span>}
    </label>
  );
}

/** What the editor held before the run in progress, so one step can be taken
 * back — an answer overwrites what the user typed. */
interface Snapshot {
  doc: JSONContent;
  isAnswer: boolean;
}

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

  const decider = composer.clipboard.field;
  const [choice, setChoice] = useState(
    composer.fields.find((field) => field.id === decider)?.default ?? "",
  );
  const [isAnswer, setIsAnswer] = useState(false);
  const [composed, setComposed] = useState(false);
  const [guidance, setGuidance] = useState("");
  const [previous, setPrevious] = useState<Snapshot | null>(null);

  // Keyed on the state object rather than on its content: the editor becomes
  // available after the first render, and re-running the effect then would
  // overwrite whatever the user has already typed into the answer.
  const applied = useRef<ComposeState>(null);
  useEffect(() => {
    if (!editor || !state?.doc || applied.current === state) return;
    applied.current = state;
    editor.commands.setContent(state.doc);
    setIsAnswer(true);
    setComposed(true);
    setGuidance("");
  }, [state, editor]);

  function restore() {
    if (!previous || !editor) return;
    editor.commands.setContent(previous.doc);
    setIsAnswer(previous.isAnswer);
    setPrevious(null);
  }

  return (
    <form
      className="settings-card"
      action={(form: FormData) => {
        if (!editor) return;
        const doc = editor.getJSON();
        // The editor is the output field: the model reads it as markdown, and
        // one markdown is all any composer's prompt asks for.
        form.set(composer.outputField, docToMarkdown(doc));
        setPrevious({ doc, isAnswer });
        formAction(form);
      }}
    >
      <input type="hidden" name="composer" value={composer.id} />
      <input type="hidden" name={REVISING_KEY} value={isAnswer ? "1" : "0"} />

      {composer.fields.map((field) =>
        field.id === composer.outputField ? (
          <div key={field.id} className="field compose-output">
            <span className="field-label">
              {field.label}
              {field.required && <span aria-hidden="true"> *</span>}
            </span>
            <ComposeEditor editor={editor} />
            {isAnswer ? (
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
                {previous && (
                  <button className="btn btn-ghost" type="button" onClick={restore}>
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
          <Field
            key={field.id}
            field={field}
            bound={
              field.id === decider ? { value: choice, onChange: setChoice } : undefined
            }
          />
        ),
      )}

      {composed && (
        <label className="field">
          <span className="field-label">What to change</span>
          <textarea
            className="field-input compose-textarea"
            name={GUIDANCE_KEY}
            rows={3}
            placeholder="Shorter. Drop the apology. Add that the deadline is the 15th…"
            value={guidance}
            onChange={(e) => setGuidance(e.target.value)}
          />
          <span className="field-help">
            Used by <b>Improve</b>. <b>Compose again</b> ignores it and re-runs the
            settings above.
          </span>
        </label>
      )}

      <div className="settings-actions">
        {state?.error && <span className="field-error">{state.error}</span>}
        {composed ? (
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
              disabled={running || !guidance.trim()}
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
