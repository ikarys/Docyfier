"use client";

import { useEffect, useRef } from "react";
import type { DocumentSearch } from "./useDocumentSearch";

/**
 * The find & replace bar (PLAN.md STEP U8). It renders a search session and
 * nothing else: what a match is, and where the next one sits, is decided in
 * `search-session.ts` and in the domain.
 */
export function SearchBar({ search }: { search: DocumentSearch }) {
  const { session, dispatch, close, replaceActive, replaceAll } = search;
  const field = useRef<HTMLInputElement>(null);

  useEffect(() => field.current?.focus(), []);

  const found = session.matches.length;
  const position = found === 0 ? "No results" : `${session.active + 1} of ${found}`;

  return (
    <div className="search-bar no-print" role="search">
      <input
        ref={field}
        className="search-field"
        value={session.query}
        placeholder="Find"
        aria-label="Find in document"
        onChange={(e) => dispatch({ type: "query", value: e.target.value })}
        onKeyDown={(e) => {
          if (e.key === "Escape") close();
          if (e.key !== "Enter") return;
          e.preventDefault();
          dispatch({ type: "step", by: e.shiftKey ? -1 : 1 });
        }}
      />
      <span className="search-count" aria-live="polite">
        {session.query === "" ? "" : position}
      </span>
      <button
        className="tb-btn"
        onClick={() => dispatch({ type: "step", by: -1 })}
        disabled={found === 0}
        title="Previous match (Shift+Enter)"
      >
        ↑
      </button>
      <button
        className="tb-btn"
        onClick={() => dispatch({ type: "step", by: 1 })}
        disabled={found === 0}
        title="Next match (Enter)"
      >
        ↓
      </button>

      <input
        className="search-field"
        value={session.replacement}
        placeholder="Replace with"
        aria-label="Replace with"
        onChange={(e) => dispatch({ type: "replacement", value: e.target.value })}
        onKeyDown={(e) => e.key === "Escape" && close()}
      />
      <button className="tb-btn" onClick={replaceActive} disabled={session.active < 0}>
        Replace
      </button>
      <button className="tb-btn" onClick={replaceAll} disabled={found === 0}>
        Replace all
      </button>

      <button
        className={session.caseSensitive ? "tb-btn is-active" : "tb-btn"}
        onClick={() => dispatch({ type: "toggle", option: "caseSensitive" })}
        aria-pressed={session.caseSensitive}
        title="Match case"
      >
        Aa
      </button>
      <button
        className={session.wholeWord ? "tb-btn is-active" : "tb-btn"}
        onClick={() => dispatch({ type: "toggle", option: "wholeWord" })}
        aria-pressed={session.wholeWord}
        title="Whole word"
      >
        ⌷
      </button>
      <button className="tb-btn" onClick={close} title="Close (Escape)">
        ✕
      </button>
    </div>
  );
}
