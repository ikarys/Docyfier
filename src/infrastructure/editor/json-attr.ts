/**
 * Read one JSON-encoded attribute off the DOM, falling back on parse errors.
 *
 * A node whose data is a list — a chart's series, a diagram's nodes — stores it
 * as JSON in a single `data-*` attribute, and pasted or hand-edited HTML can
 * always carry something that is not JSON. Falling back keeps the block
 * renderable; the domain's own validator is what decides whether it is right.
 */
export function parseJsonAttr<T>(el: HTMLElement, name: string, fallback: T): T {
  const raw = el.getAttribute(name);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
