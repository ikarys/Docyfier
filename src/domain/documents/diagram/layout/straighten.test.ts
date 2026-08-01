import { describe, expect, it } from "vitest";
import { settle, type Slot } from "./straighten";

const slot = (want: number, half = 10): Slot => ({ want, half });

/** The least room between two centres, for boxes of half-width 10 and a gap of 4. */
const APART = 24;

describe("settle", () => {
  it("leaves boxes exactly where they want to be when that is possible", () => {
    expect(settle([slot(0), slot(100), slot(200)], 4)).toEqual([0, 100, 200]);
  });

  it("puts a lone box exactly where it wants to be", () => {
    expect(settle([slot(37)], 4)).toEqual([37]);
  });

  it("has nothing to say about no boxes at all", () => {
    expect(settle([], 4)).toEqual([]);
  });

  /** Two boxes tied to the same thing both want the same place; they cannot
   * have it, so they share it — one either side, neither favoured. */
  it("splits the difference when two boxes want the same place", () => {
    const [a, b] = settle([slot(100), slot(100)], 4);
    expect(b - a).toBe(APART);
    expect((a + b) / 2).toBe(100);
  });

  it("never lets two boxes come closer than the gap allows", () => {
    const settled = settle([slot(0), slot(1), slot(2), slot(3)], 4);
    for (let i = 0; i < settled.length - 1; i++) {
      expect(settled[i + 1] - settled[i]).toBeGreaterThanOrEqual(APART);
    }
  });

  /** The ordering pass decided who sits beside whom, and a band drawn around a
   * group depends on that order. Straightening may move a box, never reorder. */
  it("keeps the order it was given, however badly the boxes want to swap", () => {
    const settled = settle([slot(500), slot(400), slot(300)], 4);
    for (let i = 0; i < settled.length - 1; i++) {
      expect(settled[i + 1]).toBeGreaterThan(settled[i]);
    }
  });

  /**
   * The failure this exists for: a chain wandering because each rank was
   * centred on its own width. A box tied to one at 300 goes to 300, whatever
   * the rest of its row is doing.
   */
  it("takes a box straight to what it is tied to", () => {
    const settled = settle([slot(0), slot(300)], 4);
    expect(settled[1]).toBe(300);
  });

  /** One box tied to something far off must not drag its whole row after it. */
  it("does not let one distant tie drag the row", () => {
    const settled = settle([slot(0), slot(0), slot(0), slot(900)], 4);
    // The three that want the same place share it, centred on it; the fourth
    // has all the room it needs and goes exactly where it is tied.
    expect(settled.slice(0, 3)).toEqual([-APART, 0, APART]);
    expect(settled[3]).toBe(900);
  });

  it("is the same answer every time, so an export can be diffed", () => {
    const slots = [slot(120), slot(40), slot(400), slot(80)];
    expect(settle(slots, 4)).toEqual(settle(slots, 4));
  });

  it("respects boxes of different lengths", () => {
    const settled = settle([{ want: 0, half: 50 }, { want: 0, half: 5 }], 10);
    expect(settled[1] - settled[0]).toBe(65);
  });
});
