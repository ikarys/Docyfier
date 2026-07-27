"use client";

import { useState } from "react";

/** What lands on the clipboard. `html` adds a rich flavour for editors that
 * accept one — a mail client keeps the formatting, everything else falls back
 * to `text`. */
export interface CopyPayload {
  text: string;
  html?: string;
}

/** A copy button, and what to say when the clipboard refuses. The API needs a
 * secure context, which a plain-HTTP instance on a LAN address is not, so the
 * failure is expected rather than exceptional: tell the user to select instead.
 *
 * A function payload is read at click time, for a source that keeps changing
 * under the button — a live editor.
 */
export function CopyButton({
  payload,
  className = "btn btn-primary",
}: {
  payload: string | CopyPayload | (() => CopyPayload);
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  async function copy() {
    const resolved = typeof payload === "function" ? payload() : payload;
    const { text, html } =
      typeof resolved === "string" ? { text: resolved, html: undefined } : resolved;
    try {
      if (html && typeof ClipboardItem !== "undefined") {
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/html": new Blob([html], { type: "text/html" }),
            "text/plain": new Blob([text], { type: "text/plain" }),
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(text);
      }
      setCopied(true);
      setFailed(false);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setFailed(true);
    }
  }

  return (
    <>
      <button className={className} type="button" onClick={copy}>
        {copied ? "Copied ✓" : "Copy"}
      </button>
      {failed && (
        <span className="field-help">
          Clipboard unavailable — select the text and copy it.
        </span>
      )}
    </>
  );
}

/** A read-only payload with a copy button. */
export function CopyBox({ payload }: { payload: string }) {
  return (
    <div className="copy-box">
      <div className="copy-box-actions">
        <CopyButton payload={payload} />
      </div>
      <textarea className="copy-box-text" readOnly value={payload} spellCheck={false} />
    </div>
  );
}
