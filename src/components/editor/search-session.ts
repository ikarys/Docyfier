import type { TextMatch } from "@/domain/documents/text-matches";

/**
 * What a search knows between two keystrokes (PLAN.md STEP U8): what was typed,
 * how it is being looked for, what was found and which occurrence the writer is
 * standing on. A reducer rather than five pieces of component state — the
 * wrapping and the "keep the caret where it was" rules are the interesting part,
 * and a test drives them without a DOM.
 */

export interface SearchSession {
  readonly query: string;
  readonly replacement: string;
  readonly caseSensitive: boolean;
  readonly wholeWord: boolean;
  readonly matches: readonly TextMatch[];
  /** Index in `matches`, or -1 when nothing is found. */
  readonly active: number;
}

export type SearchAction =
  | { type: "query"; value: string }
  | { type: "replacement"; value: string }
  | { type: "toggle"; option: "caseSensitive" | "wholeWord" }
  | { type: "found"; matches: readonly TextMatch[] }
  | { type: "step"; by: 1 | -1 }
  | { type: "close" };

export const EMPTY_SEARCH: SearchSession = {
  query: "",
  replacement: "",
  caseSensitive: false,
  wholeWord: false,
  matches: [],
  active: -1,
};

/** Nothing found yet, but what was typed is kept: reopening resumes the search. */
const forgetResults = (session: SearchSession): SearchSession => ({
  ...session,
  matches: [],
  active: -1,
});

export function searchReducer(
  session: SearchSession,
  action: SearchAction,
): SearchSession {
  switch (action.type) {
    case "query":
      return forgetResults({ ...session, query: action.value });
    case "replacement":
      return { ...session, replacement: action.value };
    case "toggle":
      // The matches were found under the previous options, so they are stale.
      return forgetResults({ ...session, [action.option]: !session[action.option] });
    case "found":
      return { ...session, matches: action.matches, active: settle(session, action.matches) };
    case "step":
      return { ...session, active: stepped(session, action.by) };
    case "close":
      return forgetResults(session);
  }
}

/**
 * Where to stand once a new set of matches arrives. Typing elsewhere in the
 * document must not throw the writer back to the first occurrence, so the
 * position is kept whenever it still exists.
 */
function settle(session: SearchSession, matches: readonly TextMatch[]): number {
  if (matches.length === 0) return -1;
  if (session.active < 0 || session.active >= matches.length) return 0;
  return session.active;
}

function stepped(session: SearchSession, by: 1 | -1): number {
  const count = session.matches.length;
  if (count === 0) return -1;
  return (session.active + by + count) % count;
}
