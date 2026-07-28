"use client";

import { useActionState } from "react";
import { saveWritingStyleAction } from "@/app/settings/style/actions";
import type { StyleParametersRecord } from "@/lib/settings-types";

/** A style parameter that is on or off. */
function Toggle({
  name,
  label,
  help,
  checked,
}: {
  name: string;
  label: string;
  help: string;
  checked: boolean;
}) {
  return (
    <div className="field">
      <label className="field-checkbox">
        <input type="checkbox" name={name} defaultChecked={checked} />
        <span>
          <strong>{label}</strong>
          <span className="field-help">{help}</span>
        </span>
      </label>
    </div>
  );
}

/** How this instance writes (PLAN.md need #15): the choices made once, for
 * every document the assistant produces. */
export function WritingStyleForm({ initial }: { initial: StyleParametersRecord }) {
  const [state, formAction, saving] = useActionState(saveWritingStyleAction, null);

  return (
    <form action={formAction} className="settings-card">
      <Toggle
        name="emoji"
        label="Emoji"
        help="Allow emoji as sparing visual anchors in headings and callouts. Off removes them from generated documents, whatever the model sends."
        checked={initial.emoji}
      />
      <Toggle
        name="autoBold"
        label="Bold the keywords"
        help="Ask for the two or three words that carry each paragraph — figures, decisions, names — in bold."
        checked={initial.autoBold}
      />
      <Toggle
        name="statusBadges"
        label="Statuses as badges"
        help='Render statuses, priorities and tags as colored pills ("On track", "P1", "Beta").'
        checked={initial.statusBadges}
      />

      <Toggle
        name="smartTypography"
        label="Smart typography"
        help="While typing, turn straight quotes into curly ones, -- into an em dash and ... into an ellipsis. Off stores exactly the characters typed."
        checked={initial.smartTypography}
      />

      <label className="field">
        <span className="field-label">Writing language</span>
        <input
          className="field-input"
          name="language"
          type="text"
          placeholder="Follow the request"
          defaultValue={initial.language}
        />
        <span className="field-help">
          Leave empty and each document is written in the language it was asked
          for. Name a language — French, Brazilian Portuguese — and every
          document comes out in it.
        </span>
      </label>

      <div className="settings-actions">
        {state?.saved && !saving && <span className="field-ok">Saved ✓</span>}
        <button className="btn btn-primary" type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save writing style"}
        </button>
      </div>
    </form>
  );
}
