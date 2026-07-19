"use client";

import { useActionState } from "react";
import { generateDocumentAction } from "@/app/ai-actions";
import { newDocumentAction } from "@/app/actions";

const EXAMPLES = [
  "A one-page status report for a cloud migration: summary, progress, risks, next steps",
  "An onboarding guide for new developers joining our team",
  "A decision memo comparing three CRM vendors, with a comparison table",
];

/** Home hero — surface 1: describe a document, the AI drafts and formats it. */
export function GenerateHero() {
  const [state, formAction, pending] = useActionState(
    generateDocumentAction,
    null,
  );

  return (
    <section className="hero">
      <h1 className="hero-title">
        What are we <span>writing</span> today?
      </h1>
      <p className="hero-sub">
        Describe your document — Docyfier drafts it, structured and formatted.
      </p>

      <form action={formAction} className="hero-card" data-pending={pending}>
        <textarea
          name="prompt"
          rows={3}
          className="hero-input"
          placeholder="e.g. A one-page project status report for the Atlas migration: summary, risks table, next steps…"
          disabled={pending}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.currentTarget.form?.requestSubmit();
            }
          }}
        />
        <div className="hero-actions">
          {state?.error ? (
            <span className="hero-error" role="alert">
              {state.error}
            </span>
          ) : (
            <span className="hero-hint">⌘⏎ to generate</span>
          )}
          <button className="btn btn-primary btn-generate" disabled={pending}>
            {pending ? (
              <>
                <span className="spinner" aria-hidden /> Generating…
              </>
            ) : (
              <>✦ Generate document</>
            )}
          </button>
        </div>
      </form>

      <div className="hero-examples">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            className="chip"
            disabled={pending}
            onClick={(e) => {
              const form = e.currentTarget
                .closest(".hero")
                ?.querySelector<HTMLTextAreaElement>(".hero-input");
              if (form) form.value = ex;
              form?.focus();
            }}
          >
            {ex.length > 64 ? `${ex.slice(0, 64)}…` : ex}
          </button>
        ))}
      </div>

      <form action={newDocumentAction} className="hero-blank">
        <button className="btn-ghost" type="submit" disabled={pending}>
          or start from a blank page →
        </button>
      </form>
    </section>
  );
}
