import { describe, expect, it } from "vitest";
import { MAX_LABEL, type DiagramAttrs } from "./diagram";
import {
  addEdge,
  addNode,
  setCaption,
  setEdgeStyle,
  setTitle,
  flipDirection,
  moveNode,
  moveToGroup,
  realign,
  removeEdge,
  removeNode,
  renameGroup,
  renameNode,
  setAccent,
  setEdgeLabel,
  setKind,
  setNote,
} from "./diagram-edits";
import { sampleDiagram } from "./sample";
import { diagramError } from "./validation";

const flow = () => sampleDiagram("flow");
const ids = (attrs: DiagramAttrs) => attrs.nodes.map((n) => n.id);
const links = (attrs: DiagramAttrs) => attrs.edges.map((e) => `${e.from}->${e.to}`);

/**
 * Every edit the panel can make, as a whole new set of attributes.
 *
 * The rule that keeps a diagram drawable is not restated per edit: an edit
 * that would break `diagramError` is simply not made, and the caller gets the
 * diagram back unchanged. The UI has nothing to check.
 */
describe("diagram edits", () => {
  it("hands the diagram back unchanged rather than making it undrawable", () => {
    const attrs = flow();
    expect(renameNode(attrs, "request", "x".repeat(MAX_LABEL + 1))).toBe(attrs);
    expect(addEdge(attrs, "request", "request")).toBe(attrs);
    expect(addEdge(attrs, "request", "ghost")).toBe(attrs);
    expect(moveToGroup(attrs, "request", "nowhere")).toBe(attrs);
  });

  it("leaves every edit it does make drawable", () => {
    const attrs = flow();
    const edited = [
      renameNode(attrs, "review", "Second look"),
      setNote(attrs, "review", "within 2 days"),
      setAccent(attrs, "review", 3),
      addNode(attrs),
      removeNode(attrs, "rejected"),
      addEdge(attrs, "approved", "request"),
      removeEdge(attrs, 0),
      setEdgeLabel(attrs, 0, "sent"),
      flipDirection(attrs),
    ];
    for (const next of edited) expect(diagramError(next)).toBeNull();
  });

  it("renames one node and touches nothing else", () => {
    const next = renameNode(flow(), "review", "Second look");
    expect(next.nodes.find((n) => n.id === "review")?.label).toBe("Second look");
    expect(ids(next)).toEqual(ids(flow()));
    expect(links(next)).toEqual(links(flow()));
  });

  it("clears a note and an accent when handed nothing", () => {
    const noted = setNote(flow(), "review", "within 2 days");
    expect(setNote(noted, "review", "").nodes.find((n) => n.id === "review")?.note).toBeUndefined();
    const accented = setAccent(flow(), "review", 2);
    expect(setAccent(accented, "review", null).nodes.find((n) => n.id === "review")?.accent)
      .toBeUndefined();
  });

  it("bridges the edges that ran through a removed node", () => {
    const next = removeNode(flow(), "review");
    expect(ids(next)).not.toContain("review");
    expect(links(next)).toContain("request->approved");
    expect(links(next)).toContain("request->rejected");
  });

  it("refuses to remove the last node, because a diagram needs one", () => {
    const attrs: DiagramAttrs = {
      ...flow(),
      nodes: [{ id: "only", label: "Only" }],
      edges: [],
    };
    expect(removeNode(attrs, "only")).toBe(attrs);
  });

  it("adds a node the flow already reaches, rather than an island", () => {
    const next = addNode(flow());
    expect(next.nodes).toHaveLength(5);
    const added = next.nodes[next.nodes.length - 1];
    expect(next.edges.some((e) => e.to === added.id)).toBe(true);
  });

  it("gives an added node an id nothing else uses", () => {
    let attrs = flow();
    for (let i = 0; i < 3; i++) attrs = addNode(attrs);
    expect(new Set(ids(attrs)).size).toBe(attrs.nodes.length);
  });
});

/**
 * Switching kind is where a panel would normally refuse and leave the user
 * stuck: a flow has edges a timeline cannot keep, and a graph a tree cannot
 * draw. The edit adapts the graph instead.
 */
describe("setKind", () => {
  it("drops the edges a timeline has no use for", () => {
    const next = setKind(flow(), "timeline");
    expect(next.kind).toBe("timeline");
    expect(next.edges).toEqual([]);
    expect(diagramError(next)).toBeNull();
  });

  it("keeps one parent per node when it becomes a hierarchy", () => {
    const attrs: DiagramAttrs = {
      ...flow(),
      edges: [...flow().edges, { from: "request", to: "approved", label: null, style: "solid", head: "arrow" }],
    };
    const next = setKind(attrs, "hierarchy");
    expect(diagramError(next)).toBeNull();
    const parents = next.edges.map((e) => e.to);
    expect(new Set(parents).size).toBe(parents.length);
  });

  it("leaves a kind it cannot reach alone", () => {
    const single: DiagramAttrs = { ...flow(), nodes: [{ id: "a", label: "A" }], edges: [] };
    expect(setKind(single, "sequence")).toBe(single);
  });
});

describe("flipDirection", () => {
  it("turns the drawing a quarter turn and back", () => {
    const once = flipDirection(flow());
    expect(once.direction).toBe("right");
    expect(flipDirection(once).direction).toBe("down");
  });
});

describe("texts and lines", () => {
  it("keeps a title and a caption, and forgets an empty one", () => {
    const titled = setTitle(flow(), "Parcours");
    expect(titled.title).toBe("Parcours");
    expect(setTitle(titled, "   ").title).toBeNull();

    const captioned = setCaption(flow(), "v2");
    expect(captioned.caption).toBe("v2");
    expect(setCaption(captioned, "").caption).toBeNull();
  });

  it("dashes an arrow and solidifies it again", () => {
    const dashed = setEdgeStyle(flow(), 0, "dashed");
    expect(dashed.edges[0].style).toBe("dashed");
    expect(setEdgeStyle(dashed, 0, "solid").edges[0].style).toBe("solid");
  });

  it("forgets an arrow label made empty", () => {
    expect(setEdgeLabel(flow(), 1, "  ").edges[1].label).toBeNull();
  });

  it("hangs a new box off the root of a hierarchy, not off its last leaf", () => {
    const next = addNode(sampleDiagram("hierarchy"));
    const added = next.nodes[next.nodes.length - 1];
    expect(next.edges.some((e) => e.from === "root" && e.to === added.id)).toBe(true);
  });

  it("adds a phase to an axis without inventing an arrow", () => {
    const next = addNode(sampleDiagram("timeline"));
    expect(next.nodes).toHaveLength(4);
    expect(next.edges).toEqual([]);
  });

  it("drops an arrow by position", () => {
    const next = removeEdge(flow(), 1);
    expect(links(next)).toEqual(["request->review", "review->rejected"]);
  });

  it("renames a group without touching what belongs to it", () => {
    const next = renameGroup(sampleDiagram("architecture"), "back", "Services");
    expect(next.groups.find((g) => g.id === "back")?.label).toBe("Services");
    expect(next.nodes.filter((n) => n.group === "back")).toHaveLength(2);
  });

  it("refuses to rename a group that is not declared", () => {
    const attrs = sampleDiagram("architecture");
    expect(renameGroup(attrs, "nowhere", "Services")).toBe(attrs);
  });

  it("remembers where a box was dropped", () => {
    const next = moveNode(flow(), "review", 240, 90);
    expect(next.nodes.find((n) => n.id === "review")).toMatchObject({ x: 240, y: 90 });
  });

  it("keeps a box dropped past the edge on the paper", () => {
    const next = moveNode(flow(), "review", -40, -10);
    expect(next.nodes.find((n) => n.id === "review")).toMatchObject({ x: 0, y: 0 });
  });

  it("refuses a place that is not a number", () => {
    const attrs = flow();
    expect(moveNode(attrs, "review", Number.NaN, 0)).toBe(attrs);
    expect(moveNode(attrs, "review", 0, Number.POSITIVE_INFINITY)).toBe(attrs);
  });

  it("hands every box back to the layout when realigning", () => {
    const moved = moveNode(moveNode(flow(), "review", 240, 90), "approved", 10, 10);
    expect(realign(moved).nodes.every((n) => n.x === undefined && n.y === undefined)).toBe(true);
  });
});
