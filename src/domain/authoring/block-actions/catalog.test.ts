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
      (action) => !/table|stepList|statRow|chart/.test(action.instruction),
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

  it("answers nothing for an action nobody registered", () => {
    expect(findBlockAction("translate")).toBeUndefined();
    expect(findBlockAction("shorten")?.label).toBe("Shorten");
  });
});
