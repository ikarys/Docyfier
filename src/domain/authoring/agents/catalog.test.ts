import { describe, expect, it } from "vitest";
import { StyleParameters } from "../style-parameters";
import { AGENTS, agentById } from "./catalog";

const style = StyleParameters.defaults();

describe("the assistant catalog", () => {
  it("ships one assistant per job, named once", () => {
    expect(AGENTS.map((agent) => agent.id)).toEqual(["writer", "designer"]);
  });

  it("finds an assistant by the id a surface names", () => {
    expect(agentById("designer").label).toBe("Laying out");
  });

  /** Arranging is mechanical and writing is not: a designer as warm as the
   * writer embellishes, which is the failure the split exists to prevent. */
  it("keeps the layout assistant colder than the writer", () => {
    expect(agentById("designer").temperature).toBeLessThan(agentById("writer").temperature);
  });

  it("gives every assistant a charter of its own", () => {
    const charters = AGENTS.map((agent) => agent.charter(style));

    expect(new Set(charters).size).toBe(AGENTS.length);
    for (const charter of charters) expect(charter.length).toBeGreaterThan(100);
  });

  it("forbids the writer the blocks the designer owns", () => {
    expect(agentById("writer").charter(style)).toMatch(/never introduce a visual block/i);
  });
});
