"use client";

import type { ComposerField as Field } from "@/domain/composing/composer";

/** A field whose value the form drives, rather than the DOM. */
export interface Bound {
  value: string;
  onChange: (value: string) => void;
}

/** One declared field, rendered as the input its type calls for. */
export function ComposerField({ field, bound }: { field: Field; bound?: Bound }) {
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
