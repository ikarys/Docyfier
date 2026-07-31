"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_PAGE_VIEW,
  readPageView,
  zoomBy,
  type PageView,
} from "./page-view";

/**
 * The writer's own view of the page, kept between visits.
 *
 * In the browser, not in the document: it is a preference of the person
 * reading, and storing it in the body would make one writer's zoom everyone
 * else's. Read after mount rather than during render, so the server and the
 * first client paint agree on the default.
 */

const KEY = "docyfier.page-view";

export interface PageViewControl {
  readonly view: PageView;
  setPaper(paper: string): void;
  zoom(direction: 1 | -1): void;
  reset(): void;
}

export function usePageView(): PageViewControl {
  const [view, setView] = useState<PageView>(DEFAULT_PAGE_VIEW);

  useEffect(() => {
    setView(readPageView(window.localStorage.getItem(KEY)));
  }, []);

  const remember = useCallback((next: PageView) => {
    setView(next);
    // A browser that refuses storage — private mode, a full quota — must cost
    // the preference, never the editor.
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* the view still applies for this visit */
    }
  }, []);

  return {
    view,
    setPaper: (paper) => remember({ ...view, paper }),
    zoom: (direction) => remember({ ...view, zoom: zoomBy(view.zoom, direction) }),
    reset: () => remember(DEFAULT_PAGE_VIEW),
  };
}
