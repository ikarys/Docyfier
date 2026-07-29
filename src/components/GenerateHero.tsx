"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startGeneratedDocumentAction } from "@/app/ai-actions";
import { stashPrompt, takeGenerateError } from "@/components/editor/generation-handover";

const EXAMPLES = [
  "A one-page status report for a cloud migration: summary, progress, risks, next steps",
  "An onboarding guide for new developers joining our team",
  "A decision memo comparing three CRM vendors, with a comparison table",
];

/**
 * Home hero — surface 1: describe a document, the AI drafts and formats it.
 *
 * Since STEP U4 the generation runs in the editor and streams block by block:
 * this only creates the empty document, hands the prompt over and navigates.
 */
export function GenerateHero() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A generation that died before writing anything deletes its document and
  // sends the user back here with the reason.
  useEffect(() => setError(takeGenerateError()), []);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    const field = event.currentTarget.elements.namedItem(
      "prompt",
    ) as HTMLTextAreaElement | null;
    const prompt = field?.value.trim() ?? "";
    if (!prompt) {
      setError("Describe the document you want first.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const id = await startGeneratedDocumentAction();
      stashPrompt(id, prompt);
      router.push(`/doc/${id}`);
    } catch {
      setError("Could not start a new document.");
      setPending(false);
    }
  };

  return (
    <section className="hero">
      <h1 className="hero-title">
        What are we <span>writing</span> today?
      </h1>
      <p className="hero-sub">
        Describe your document — Docyfier drafts it, structured and formatted.
      </p>

      <form onSubmit={submit} className="hero-card" data-pending={pending}>
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
          {error ? (
            <span className="hero-error" role="alert">
              {error}
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

      <div className="hero-blank">
        <Link className="btn-ghost" href="/new">
          or start from a template, a blank page or a file →
        </Link>
      </div>
    </section>
  );
}
