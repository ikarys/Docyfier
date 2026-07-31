/**
 * How the writer is looking at the page — which paper, and from how far.
 *
 * A view preference, never document data: two people opening the same document
 * see it in their own paper and their own zoom, nothing is stored in the body,
 * nothing reaches an export, and printing ignores both (`@page` decides that,
 * and it is A4 whatever the screen shows).
 *
 * Stated over plain values so a test can drive every rule without a DOM.
 */

export interface Paper {
  readonly id: string;
  readonly label: string;
  /** The sheet's width at 100%, in rem. */
  readonly rem: number;
  readonly hint: string;
}

/**
 * A4 is 210mm, which is 794px — narrower than the sheet has ever been. It is
 * offered because it is what comes out of the printer, not because it is
 * roomier: a writer who wants to see the page breaks where the reader will
 * wants exactly this one.
 */
export const PAPERS: readonly Paper[] = [
  { id: "a4", label: "A4", rem: 49.6, hint: "210 mm — what prints" },
  { id: "wide", label: "Wide", rem: 56, hint: "Roomier than A4" },
  { id: "full", label: "Full", rem: 0, hint: "As wide as the window" },
];

export const DEFAULT_PAPER = "wide";

export function paperById(id: string): Paper {
  return PAPERS.find((paper) => paper.id === id) ?? PAPERS[1];
}

/** The `max-width` a paper asks for; "none" is the one that has no width. */
export function paperWidth(paper: Paper, zoom: number): string {
  return paper.rem === 0 ? "none" : `${paper.rem * zoom}rem`;
}

/** The steps the buttons walk. Fine enough to be useful, coarse enough to end. */
export const ZOOM_STEPS = [0.75, 0.9, 1, 1.1, 1.25, 1.5, 2] as const;

export const DEFAULT_ZOOM = 1;

/** The nearest step this value sits on, so a stored oddity still lands on one. */
export function nearestZoom(value: number): number {
  return ZOOM_STEPS.reduce((best, step) =>
    Math.abs(step - value) < Math.abs(best - value) ? step : best,
  );
}

/** One step out, or the same zoom when there is no further to go. */
export function zoomBy(zoom: number, direction: 1 | -1): number {
  const at = ZOOM_STEPS.indexOf(nearestZoom(zoom) as (typeof ZOOM_STEPS)[number]);
  return ZOOM_STEPS[Math.min(ZOOM_STEPS.length - 1, Math.max(0, at + direction))];
}

export const asPercent = (zoom: number): string => `${Math.round(zoom * 100)}%`;

export interface PageView {
  readonly paper: string;
  readonly zoom: number;
}

export const DEFAULT_PAGE_VIEW: PageView = { paper: DEFAULT_PAPER, zoom: DEFAULT_ZOOM };

/**
 * A stored preference, repaired rather than trusted: it comes from a browser
 * this build has no control over, and a paper that no longer exists must not
 * leave the editor with no width at all.
 */
export function readPageView(stored: string | null): PageView {
  if (!stored) return DEFAULT_PAGE_VIEW;
  try {
    const value: unknown = JSON.parse(stored);
    const { paper, zoom } = (value ?? {}) as { paper?: unknown; zoom?: unknown };
    return {
      paper: PAPERS.some((known) => known.id === paper) ? (paper as string) : DEFAULT_PAPER,
      zoom: typeof zoom === "number" && zoom > 0 ? nearestZoom(zoom) : DEFAULT_ZOOM,
    };
  } catch {
    return DEFAULT_PAGE_VIEW;
  }
}

/** The two custom properties the sheet is drawn from. */
export function pageViewStyle(view: PageView): Record<string, string> {
  return {
    "--doc-paper": paperWidth(paperById(view.paper), view.zoom),
    "--doc-zoom": String(view.zoom),
  };
}
