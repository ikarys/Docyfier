import { findScope } from "@/lib/settings-scopes";

/** The one-line description of a settings scope, taken from the same list that
 * builds the tabs so a scope is described in exactly one place. */
export function ScopeIntro({ scope }: { scope: string }) {
  const found = findScope(scope);
  if (!found) return null;
  return <p className="lede">{found.lede}</p>;
}
