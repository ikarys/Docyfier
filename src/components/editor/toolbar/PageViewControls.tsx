"use client";

import { PAPERS, asPercent, ZOOM_STEPS } from "../page-view";
import type { PageViewControl } from "../usePageView";

/**
 * Which paper, and from how far. Two settings that look alike and are not:
 * the paper is what the document is, the zoom is where the reader stands.
 */
export function PageViewControls({ page }: { page: PageViewControl }) {
  const { view } = page;
  return (
    <div className="tb-group tb-page" role="group" aria-label="Page view">
      <select
        className="tb-select"
        value={view.paper}
        onChange={(event) => page.setPaper(event.target.value)}
        title="Page width — printing is always A4"
        aria-label="Page width"
      >
        {PAPERS.map((paper) => (
          <option key={paper.id} value={paper.id}>
            {paper.label} · {paper.hint}
          </option>
        ))}
      </select>
      <button
        className="tb-btn"
        onClick={() => page.zoom(-1)}
        disabled={view.zoom <= ZOOM_STEPS[0]}
        title="Zoom out"
        aria-label="Zoom out"
      >
        −
      </button>
      <button
        className="tb-btn tb-zoom"
        onClick={page.reset}
        title="Back to 100%"
        aria-label={`Zoom ${asPercent(view.zoom)} — back to 100%`}
      >
        {asPercent(view.zoom)}
      </button>
      <button
        className="tb-btn"
        onClick={() => page.zoom(1)}
        disabled={view.zoom >= ZOOM_STEPS[ZOOM_STEPS.length - 1]}
        title="Zoom in"
        aria-label="Zoom in"
      >
        +
      </button>
    </div>
  );
}
