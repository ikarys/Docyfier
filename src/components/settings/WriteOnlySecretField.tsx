"use client";

import {
  forgotten,
  offersToForget,
  typed,
  type WriteOnlySecret,
} from "./write-only-secret";

/**
 * The input for a credential the browser is never given back: a database
 * password, an LLM API key.
 *
 * Every one of them behaves the same way — an empty field keeps what is stored,
 * erasing has to be asked for, typing takes that back — so the field is written
 * once and told which secret it is. The `<name>Cleared` companion input is what
 * carries that intent to the server action.
 */
export function WriteOnlySecretField({
  label,
  name,
  noun,
  secret,
  stored,
  emptyPlaceholder = "",
  change,
}: {
  label: string;
  name: string;
  /** How the secret is named in a sentence: "password", "key". */
  noun: string;
  secret: WriteOnlySecret;
  stored: boolean;
  emptyPlaceholder?: string;
  change: (secret: WriteOnlySecret) => void;
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <input type="hidden" name={`${name}Cleared`} value={secret.cleared ? "1" : "0"} />
      <input
        className="field-input"
        name={name}
        type="password"
        value={secret.value}
        onChange={(e) => change(typed(secret, e.target.value))}
        placeholder={
          stored && !secret.cleared
            ? "•••••••• saved — leave empty to keep it"
            : emptyPlaceholder
        }
        autoComplete="off"
      />
      <span className="field-help">
        Stored encrypted; it never leaves the server once saved.
        {offersToForget(secret, stored) && (
          <>
            {" "}
            <button
              type="button"
              className="link-button"
              onClick={() => change(forgotten(secret))}
            >
              Remove the saved {noun}
            </button>
          </>
        )}
        {secret.cleared && ` The saved ${noun} will be removed on save.`}
      </span>
    </label>
  );
}
