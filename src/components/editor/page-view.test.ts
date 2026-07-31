import { describe, expect, it } from "vitest";
import {
  DEFAULT_PAGE_VIEW,
  PAPERS,
  asPercent,
  nearestZoom,
  pageViewStyle,
  paperById,
  paperWidth,
  readPageView,
  zoomBy,
} from "./page-view";

/**
 * The rules of looking at the page. None of them touches a document: what a
 * writer sets here is theirs, and a reader of the same document sets their own.
 */

describe("zooming", () => {
  it("walks one step at a time", () => {
    expect(zoomBy(1, 1)).toBe(1.1);
    expect(zoomBy(1, -1)).toBe(0.9);
  });

  it("stops at each end rather than running off it", () => {
    expect(zoomBy(0.75, -1)).toBe(0.75);
    expect(zoomBy(2, 1)).toBe(2);
  });

  it("lands a value between two steps on the nearer one", () => {
    expect(nearestZoom(1.18)).toBe(1.25);
    expect(nearestZoom(0.4)).toBe(0.75);
  });

  it("reads as a percentage, which is what the button shows", () => {
    expect(asPercent(1)).toBe("100%");
    expect(asPercent(0.75)).toBe("75%");
  });
});

describe("the paper", () => {
  it("gives the full-width one no width at all", () => {
    expect(paperWidth(paperById("full"), 1)).toBe("none");
  });

  it("grows a sheet with the zoom, so the page comes closer whole", () => {
    expect(paperWidth(paperById("a4"), 1)).toBe("49.6rem");
    expect(paperWidth(paperById("a4"), 1.25)).toBe("62rem");
  });

  /** A4 is 210 mm — 794 px, narrower than the editor's own sheet has ever
   * been. It is here because it is what prints, not because it is roomier. */
  it("keeps A4 at the width that actually prints", () => {
    expect(paperById("a4").rem * 16).toBeCloseTo(794, 0);
  });

  it("falls back to a real paper when the stored one is gone", () => {
    expect(paperById("papyrus").id).toBe(DEFAULT_PAGE_VIEW.paper);
  });
});

describe("what a browser gave back", () => {
  it("takes a preference someone set", () => {
    expect(readPageView('{"paper":"a4","zoom":1.25}')).toEqual({ paper: "a4", zoom: 1.25 });
  });

  it("repairs anything else rather than leaving the sheet without a width", () => {
    for (const stored of [null, "", "not json", "{}", '{"paper":"papyrus","zoom":-4}']) {
      expect(readPageView(stored)).toEqual(DEFAULT_PAGE_VIEW);
    }
  });
});

describe("what the sheet is drawn from", () => {
  it("is two custom properties and nothing else", () => {
    expect(pageViewStyle({ paper: "wide", zoom: 1.1 })).toEqual({
      "--doc-paper": `${56 * 1.1}rem`,
      "--doc-zoom": "1.1",
    });
  });

  it("names every paper the picker offers", () => {
    for (const paper of PAPERS) {
      expect(paperById(paper.id)).toBe(paper);
    }
  });
});
