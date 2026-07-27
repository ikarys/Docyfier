"use client";

import { useActionState } from "react";
import { composeAction } from "@/app/compose/actions";
import { CopyBox } from "@/components/CopyBox";
import type { ComposerField, ComposerInfo } from "@/lib/compose/types";

/** One declared field, rendered as the input its type calls for. */
function Field({ field }: { field: ComposerField }) {
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
          defaultValue={field.default}
          required={field.required}
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

/**
 * One composer: its fields, and the text they produce. The form is uncontrolled
 * so the inputs survive a run and the user can adjust one choice and compose
 * again without retyping.
 */
export function ComposerForm({ composer }: { composer: ComposerInfo }) {
  const [state, formAction, running] = useActionState(composeAction, null);

  return (
    <>
      <form action={formAction} className="settings-card">
        <input type="hidden" name="composer" value={composer.id} />

        {composer.fields.map((field) => (
          <Field key={field.id} field={field} />
        ))}

        <div className="settings-actions">
          {state?.error && <span className="field-error">{state.error}</span>}
          <button className="btn btn-primary" type="submit" disabled={running}>
            {running ? "Composing…" : state?.text ? "Compose again" : "Compose"}
          </button>
        </div>
      </form>

      {state?.text && (
        <section className="compose-result">
          <h2 className="picker-heading">Result</h2>
          <p className="field-help">{composer.instructions}</p>
          <CopyBox payload={state.text} />
        </section>
      )}
    </>
  );
}
