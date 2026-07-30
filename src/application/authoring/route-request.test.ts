import { describe, expect, it } from "vitest";
import { ScriptedGenerator, authoringDeps } from "@test/fakes/authoring-deps";
import { ModelUnavailable } from "@/domain/authoring/text-generator";
import { routeRequest } from "./route-request";

describe("routeRequest", () => {
  it("answers a surface that names its own assistant without asking a model", async () => {
    const generator = new ScriptedGenerator([]);
    const deps = authoringDeps(generator);

    const assignment = await routeRequest(
      deps,
      { kind: "block-action", family: "turn-into" },
      "Turn this into a table",
    );

    expect(assignment.steps).toEqual(["designer"]);
    expect(generator.requests).toHaveLength(0);
  });

  it("asks the model to read a free prompt", async () => {
    const generator = new ScriptedGenerator([
      '{"steps":["writer","designer"],"reason":"Rewriting, then laying out"}',
    ]);

    const assignment = await routeRequest(
      authoringDeps(generator),
      { kind: "free-prompt" },
      "Shorten it and make it scannable",
    );

    expect(assignment.steps).toEqual(["writer", "designer"]);
    expect(assignment.reason).toBe("Rewriting, then laying out");
  });

  /** Dispatching twice on the same request must not give two answers. */
  it("asks for the dispatch at temperature zero", async () => {
    const generator = new ScriptedGenerator(['{"steps":["designer"]}']);

    await routeRequest(authoringDeps(generator), { kind: "free-prompt" }, "Make it scannable");

    expect(generator.requests[0]?.temperature).toBe(0);
  });

  it("falls back on the writer when the answer is unreadable", async () => {
    const generator = new ScriptedGenerator(["I would suggest improving the layout."]);

    const assignment = await routeRequest(
      authoringDeps(generator),
      { kind: "free-prompt" },
      "Improve this",
    );

    expect(assignment.steps).toEqual(["writer"]);
  });

  /** A dead provider is the surface's error to show: swallowing it here would
   * report "rewriting" and then fail with something else entirely. */
  it("hands an unreachable model straight back", async () => {
    const generator = new ScriptedGenerator([]);
    generator.generate = async () => {
      throw new ModelUnavailable("nope");
    };

    await expect(
      routeRequest(authoringDeps(generator), { kind: "free-prompt" }, "Improve this"),
    ).rejects.toBeInstanceOf(ModelUnavailable);
  });
});
