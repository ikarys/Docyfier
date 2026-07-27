"use client";

import { useState } from "react";

/** A read-only payload with a copy button. Falls back to selecting the text
 * when the clipboard API is unavailable — it needs a secure context, which a
 * plain-HTTP instance on a LAN address is not. */
export function CopyBox({ payload }: { payload: string }) {
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
    <div className="copy-box">
      <div className="copy-box-actions">
        <button className="btn btn-primary" type="button" onClick={copy}>
          {copied ? "Copied ✓" : "Copy"}
        </button>
        {failed && (
          <span className="field-help">
            Clipboard unavailable — select the text below and copy it.
          </span>
        )}
      </div>
      <textarea className="copy-box-text" readOnly value={payload} spellCheck={false} />
    </div>
  );
}
