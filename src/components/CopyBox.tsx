"use client";

import { useState } from "react";

/** A copy button, and what to say when the clipboard refuses. The API needs a
 * secure context, which a plain-HTTP instance on a LAN address is not, so the
 * failure is expected rather than exceptional: tell the user to select instead.
 */
export function CopyButton({
  payload,
  className = "btn btn-primary",
}: {
  payload: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(payload);
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
