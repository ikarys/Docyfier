import { describe, expect, it } from "vitest";
import type { DiagramNode } from "../diagram";
import {
  boxFrom,
  MAX_BOX_WIDTH,
  MIN_BOX_WIDTH,
  uniformBoxSize,
  wrapLabel,
} from "./geometry";
import { MAX_NOTE } from "../diagram";

const node = (label: string, note?: string): DiagramNode => ({ id: label, label, note });

describe("wrapLabel", () => {
  it("keeps a short label on one line", () => {
    expect(wrapLabel("Review", 120)).toEqual(["Review"]);
  });

  it("breaks on words rather than mid-word", () => {
    expect(wrapLabel("Send the request", 100)).toEqual(["Send the", "request"]);
  });

  it("keeps a word too long for the line rather than dropping it", () => {
    expect(wrapLabel("Antidisestablishmentarianism", 40)).toEqual([
      "Antidisestablishmentarianism",
    ]);
  });

  it("ellipses what will not fit in the lines it is given", () => {
    const lines = wrapLabel("one two three four five six seven eight", 60, 2);
    expect(lines).toHaveLength(2);
    expect(lines[1].endsWith("…")).toBe(true);
  });

  it("gives an empty label a line to sit on, so the box still draws", () => {
    expect(wrapLabel("", 120)).toEqual([""]);
    expect(wrapLabel("   ", 120)).toEqual([""]);
  });
});

/**
 * One size for every box: differing widths read as an accident, a single
 * measured size reads as a decision.
 */
describe("uniformBoxSize", () => {
  it("never goes below the minimum, however short the labels", () => {
    expect(uniformBoxSize([node("A"), node("B")]).width).toBe(MIN_BOX_WIDTH);
  });

  it("never goes past the maximum, however long they are", () => {
    expect(uniformBoxSize([node("x".repeat(80))]).width).toBe(MAX_BOX_WIDTH);
  });

  it("measures every box against the widest, not against its own text", () => {
    const together = uniformBoxSize([node("A"), node("A longer label here")]);
    expect(together.width).toBe(uniformBoxSize([node("A longer label here")]).width);
  });

  it("makes room for a note only when one box carries it", () => {
    const plain = uniformBoxSize([node("API"), node("DB")]);
    const noted = uniformBoxSize([node("API"), node("DB", "PostgreSQL")]);
    expect(noted.height).toBeGreaterThan(plain.height);
  });

  /**
   * An empty note is no note. `diagramError` accepts one, so a box carrying
   * `""` reaches the layout — and anything reading the placement back has to
   * reach the same verdict, or it offers a note field the box has no room for.
   */
  it("treats a note nobody wrote as no note at all", () => {
    const plain = uniformBoxSize([node("API"), node("DB")]);
    expect(uniformBoxSize([node("API"), node("DB", "")]).height).toBe(plain.height);
    expect(boxFrom(node("DB", ""), { x: 0, y: 0 }, plain).note).toBeNull();
  });

  it("grows tall enough for a label that wraps", () => {
    const one = uniformBoxSize([node("API")]);
    const two = uniformBoxSize([node("A rather long service name")]);
    expect(two.height).toBeGreaterThan(one.height);
  });

  /**
   * A note is free text, and at MAX_BOX_WIDTH it wraps on screen just like a
   * label does. A box sized for one note line clips or overlaps whatever sits
   * below it the moment a note runs past that line.
   */
  it("grows tall enough for a note that wraps", () => {
    const short = uniformBoxSize([node("DB", "PostgreSQL")]);
    const long = uniformBoxSize([
      node("DB", "mount: kv/ (v2) policies: eso-reader, dev-projects, ci-terraform auth: k8s+jwt"),
    ]);
    expect(long.height).toBeGreaterThan(short.height);
  });
});

describe("boxFrom", () => {
  it("wraps the note the way it wraps the label, so the box drawn matches the box measured", () => {
    const long = node(
      "DB",
      "mount: kv/ (v2) policies: eso-reader, dev-projects, ci-terraform auth: k8s+jwt",
    );
    const size = uniformBoxSize([long]);
    const placed = boxFrom(long, { x: 0, y: 0 }, size);
    expect(placed.noteLines.length).toBeGreaterThan(1);
    expect(placed.noteLines.join(" ")).not.toContain("  ");
  });

  /**
   * `MAX_NOTE` is the validator's ceiling on how much a note may say; the wrap
   * cap must not sit below it, or a note the validator let through still loses
   * words on screen — the bug that made a converted diagram look faithful to
   * its own attrs but not to the drawing it was read from.
   */
  it("wraps a note at MAX_NOTE's length without ellipsis", () => {
    const items = "unseal-key, root-token, oidc-secret, recovery-keys, ";
    const note = items.repeat(Math.ceil(MAX_NOTE / items.length)).slice(0, MAX_NOTE);
    const long = node("Platform KV", note);
    const size = uniformBoxSize([long]);
    const placed = boxFrom(long, { x: 0, y: 0 }, size);
    expect(placed.noteLines.length).toBeGreaterThan(2);
    expect(placed.noteLines.some((line) => line.endsWith("…"))).toBe(false);
  });
});
