import { describe, expect, it } from "vitest";
import { composeContext, IMPROVE_INTENT } from "./submission";

/**
 * Guidance is honoured only for the button that asks for it: a plain re-run
 * must not silently re-apply an instruction still sitting in the box.
 */
describe("composeContext", () => {
  it("reads guidance only when the improve button submitted the form", () => {
    expect(
      composeContext({ revising: null, intent: IMPROVE_INTENT, guidance: " plus court " }),
    ).toEqual({ revising: false, guidance: "plus court" });
  });

  it("drops guidance on a plain re-run", () => {
    expect(
      composeContext({ revising: null, intent: null, guidance: "plus court" }).guidance,
    ).toBe("");
  });

  it("reports whether the run iterates on a previous answer", () => {
    const of = (revising: string | null) =>
      composeContext({ revising, intent: null, guidance: null }).revising;

    expect(of("1")).toBe(true);
    expect(of("0")).toBe(false);
    expect(of(null)).toBe(false);
  });

  it("caps the guidance, same budget guard as a field", () => {
    const { guidance } = composeContext({
      revising: null,
      intent: IMPROVE_INTENT,
      guidance: "a".repeat(3000),
    });

    expect(guidance).toHaveLength(2000);
  });
});
