import { describe, expect, it } from "vitest";
import { BLOCK_ACTIONS, blockActionsOf, findBlockAction } from "./catalog";

describe("the block action catalog", () => {
  it("has a distinct id per action — the menu keys its rows by it", () => {
    const ids = BLOCK_ACTIONS.map((action) => action.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every action something to tell the model", () => {
    const mute = BLOCK_ACTIONS.filter((action) => action.instruction.trim().length < 20);
    expect(mute).toEqual([]);
  });

  it("names the block each conversion must produce, or it produces a paragraph", () => {
    const vague = blockActionsOf("turn-into").filter(
      (action) => !/table|stepList|statRow|chart|diagram/.test(action.instruction),
    );
    expect(vague).toEqual([]);
  });

  it("keeps each family in catalog order, which is the order the menu draws", () => {
    expect(blockActionsOf("rewrite").map((a) => a.id)).toEqual([
      "rewrite",
      "shorten",
      "expand",
    ]);
  });

  /**
   * A drawing made of text is the one source that is not prose. A model handed
   * a code block reads it as code unless the instruction says it is a picture.
   */
  it("tells the two conversions that read a drawing that it is one", () => {
    for (const id of ["into-diagram", "into-steps"]) {
      expect(findBlockAction(id)?.instruction).toMatch(/drawing made of text/);
    }
  });

  /**
   * The charter refuses an answer that states a figure the passage did not
   * (`layout-fidelity.ts`), and a model handed a drawing counts what it sees:
   * two namespaces, three policies. Nothing forbade it, so every conversion of
   * a drawing was refused for a number nobody had asked for — the action looked
   * broken rather than disobeyed. What is measured has to be what is asked.
   */
  it("forbids every conversion the figure the source never stated", () => {
    const silent = blockActionsOf("turn-into").filter(
      (action) => !/figure|number/i.test(action.instruction),
    );
    expect(silent).toEqual([]);
  });

  /**
   * A drawing states no figures at all, and the two conversions that live on
   * figures cannot invent their way out of that: they have to hand the block
   * back rather than answer with counts.
   */
  it("tells the figure conversions what to do when there are none", () => {
    for (const id of ["into-stats", "into-chart"]) {
      expect(findBlockAction(id)?.instruction).toMatch(/leave the block as it is/);
    }
  });

  it("answers nothing for an action nobody registered", () => {
    expect(findBlockAction("translate")).toBeUndefined();
    expect(findBlockAction("shorten")?.label).toBe("Shorten");
  });
});
