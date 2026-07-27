"use client";

import { useActionState, useEffect, useState } from "react";
import { composeAction } from "@/app/compose/actions";
import { CopyButton } from "@/components/CopyBox";
import {
  GUIDANCE_KEY,
  INTENT_KEY,
  REVISING_KEY,
  type ComposerField,
  type ComposerInfo,
} from "@/lib/compose/types";

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
        <select className="field-input" name={field.id} defaultValue={field.default}>
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
          {...(bound
            ? { value: bound.value, onChange: (e) => bound.onChange(e.target.value) }
            : { defaultValue: field.default })}
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

/** What the output field held before the run in progress, so one step can be
 * taken back — an answer overwrites what the user typed. */
interface Snapshot {
  text: string;
  isAnswer: boolean;
}

/**
 * One composer: its fields, and the text they produce. The answer is written
 * back into the composer's output field instead of landing in a read-only box
 * below, so the user edits it and composes again on top of it. The other fields
 * stay uncontrolled: they survive a run on their own, and changing one before
 * the next pass is the point.
 */
export function ComposerForm({ composer }: { composer: ComposerInfo }) {
  const [state, formAction, running] = useActionState(composeAction, null);
  const [text, setText] = useState(
    composer.fields.find((field) => field.id === composer.outputField)?.default ?? "",
  );
  const [isAnswer, setIsAnswer] = useState(false);
  const [composed, setComposed] = useState(false);
  const [guidance, setGuidance] = useState("");
  const [previous, setPrevious] = useState<Snapshot | null>(null);

  useEffect(() => {
    if (!state?.text) return;
    setText(state.text);
    setIsAnswer(true);
    setComposed(true);
    setGuidance("");
  }, [state]);

  function restore() {
    if (!previous) return;
    setText(previous.text);
    setIsAnswer(previous.isAnswer);
    setPrevious(null);
  }

  const canRestore = previous !== null && previous.text !== text;

  return (
    <form
      className="settings-card"
      action={(form: FormData) => {
        setPrevious({ text, isAnswer });
        formAction(form);
      }}
    >
      <input type="hidden" name="composer" value={composer.id} />
      <input type="hidden" name={REVISING_KEY} value={isAnswer ? "1" : "0"} />

      {composer.fields.map((field) =>
        field.id === composer.outputField ? (
          <div key={field.id} className="compose-output">
            <Field field={field} bound={{ value: text, onChange: setText }} />
            {isAnswer && (
              <div className="compose-output-actions">
                <CopyButton payload={text} className="btn" />
                {canRestore && (
                  <button className="btn btn-ghost" type="button" onClick={restore}>
                    Restore my input
                  </button>
                )}
                <span className="field-help">{composer.instructions}</span>
              </div>
            )}
          </div>
        ) : (
          <Field key={field.id} field={field} />
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
              value="improve"
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
