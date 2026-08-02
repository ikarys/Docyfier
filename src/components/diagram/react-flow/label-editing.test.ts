import { describe, expect, it } from "vitest";
import { MAX_LABEL, type DiagramAttrs } from "@/domain/documents/diagram/diagram";
import { sampleDiagram } from "@/domain/documents/diagram/sample";
import { commitLabel, textOf, type EditingTarget } from "./label-editing";

/**
 * Which edit a piece of text on the drawing stands for.
 *
 * The canvas knows what was double-clicked and what was typed; everything else
 * — whether that is a rename, a note or an arrow's label, and whether the
 * result is a diagram at all — is decided here, so a test drives it without a
 * browser.
 */

const flow = () => sampleDiagram("flow");
const architecture = () => sampleDiagram("architecture");

function commit(attrs: DiagramAttrs, target: EditingTarget, text: string): DiagramAttrs {
  return commitLabel(attrs, target, text) as DiagramAttrs;
}

describe("editing a piece of text on the drawing", () => {
  it("starts from what is written there", () => {
    expect(textOf(flow(), { of: "label", id: "review" })).toBe("Review");
    expect(textOf(architecture(), { of: "note", id: "web" })).toBe("Next.js");
    expect(textOf(architecture(), { of: "band", id: "back" })).toBe("Back");
    expect(textOf(flow(), { of: "wire", index: 1 })).toBe("yes");
  });

  it("has nothing to write when a box carries no note", () => {
    expect(textOf(flow(), { of: "note", id: "review" })).toBe("");
  });

  it("renames the box, the note, the band and the arrow", () => {
    expect(commit(flow(), { of: "label", id: "review" }, "Triage").nodes[1].label).toBe("Triage");
    expect(commit(flow(), { of: "note", id: "review" }, "48h").nodes[1].note).toBe("48h");
    expect(commit(architecture(), { of: "band", id: "back" }, "Services").groups[1].label).toBe(
      "Services",
    );
    expect(commit(flow(), { of: "wire", index: 1 }, "accepted").edges[1].label).toBe("accepted");
  });

  /** An autosave for a document nobody changed is a write, a version and a diff. */
  it("writes nothing when the text came back the same", () => {
    expect(commitLabel(flow(), { of: "label", id: "review" }, "Review")).toBeNull();
    expect(commitLabel(flow(), { of: "note", id: "review" }, "")).toBeNull();
    expect(commitLabel(flow(), { of: "wire", index: 0 }, "")).toBeNull();
  });

  it("writes nothing when the diagram would stop being drawable", () => {
    expect(commitLabel(flow(), { of: "label", id: "review" }, "x".repeat(MAX_LABEL + 1))).toBeNull();
    expect(commitLabel(flow(), { of: "band", id: "nowhere" }, "Stray")).toBeNull();
  });

  it("takes an emptied note away rather than storing a blank one", () => {
    const next = commit(architecture(), { of: "note", id: "web" }, "  ");
    expect(next.nodes[0].note).toBeUndefined();
  });
});
