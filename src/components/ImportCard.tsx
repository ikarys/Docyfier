"use client";

import { useActionState, useRef } from "react";
import { useFormStatus } from "react-dom";
import { importDocumentAction } from "@/app/actions";
import { IMPORT_EXTENSIONS } from "@/lib/doc/import-types";

/**
 * Import card in the template gallery (PLAN.md STEP 5): pick a file, it is
 * converted to a document and opened in the editor. Picking the file submits —
 * there is nothing else to fill in.
 */

function ImportButton({ onPick }: { onPick: () => void }) {
  const { pending } = useFormStatus();
  return (
    <button type="button" onClick={onPick} disabled={pending}>
      <span className="tpl-thumb tpl-thumb-import" aria-hidden>
        {pending ? <span className="spinner" /> : "↥"}
      </span>
      <span className="tpl-card-label">
        {pending ? "Importing…" : "Import a file"}
      </span>
      <span className="tpl-card-desc">
        {IMPORT_EXTENSIONS.join(", ")} — converted into an editable document.
      </span>
    </button>
  );
}

export function ImportCard() {
  const [state, formAction] = useActionState(importDocumentAction, null);
  const input = useRef<HTMLInputElement>(null);
  const form = useRef<HTMLFormElement>(null);

  return (
    <form ref={form} action={formAction} className="tpl-card tpl-card-import">
      <input
        ref={input}
        type="file"
        name="file"
        accept={IMPORT_EXTENSIONS.join(",")}
        hidden
        onChange={() => form.current?.requestSubmit()}
      />
      <ImportButton onPick={() => input.current?.click()} />
      {state?.error ? (
        <span className="tpl-card-error" role="alert">
          {state.error}
        </span>
      ) : null}
    </form>
  );
}
