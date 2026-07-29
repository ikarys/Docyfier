import type { DiagramAttrs, DiagramEdge, DiagramKind } from "./diagram";

/**
 * Placeholder content for a freshly inserted diagram, one shape per kind.
 *
 * Every sample is a small but complete example of what its kind is for: the
 * user replaces labels rather than working out what the block expects, which is
 * the same bargain `sampleChart` makes.
 */

function link(from: string, to: string, label: string | null = null): DiagramEdge {
  return { from, to, label, style: "solid", head: "arrow" };
}

const SAMPLES: Record<DiagramKind, Omit<DiagramAttrs, "kind">> = {
  flow: {
    direction: "down",
    nodes: [
      { id: "request", label: "Request" },
      { id: "review", label: "Review" },
      { id: "approved", label: "Approved", accent: 2 },
      { id: "rejected", label: "Rejected", accent: 4 },
    ],
    edges: [
      link("request", "review"),
      link("review", "approved", "yes"),
      link("review", "rejected", "no"),
    ],
    groups: [],
    title: null,
    caption: null,
  },
  architecture: {
    direction: "down",
    nodes: [
      { id: "web", label: "Web app", note: "Next.js", group: "front" },
      { id: "api", label: "API", note: "REST", group: "back", accent: 2 },
      { id: "db", label: "Database", note: "PostgreSQL", group: "back", accent: 3 },
    ],
    edges: [link("web", "api"), link("api", "db")],
    groups: [
      { id: "front", label: "Front" },
      { id: "back", label: "Back" },
    ],
    title: null,
    caption: null,
  },
  sequence: {
    direction: "right",
    nodes: [
      { id: "user", label: "User" },
      { id: "app", label: "App" },
      { id: "service", label: "Service", accent: 2 },
    ],
    edges: [
      link("user", "app", "opens"),
      link("app", "service", "asks"),
      { ...link("service", "app", "answers"), style: "dashed" },
    ],
    groups: [],
    title: null,
    caption: null,
  },
  hierarchy: {
    direction: "down",
    nodes: [
      { id: "root", label: "Product" },
      { id: "design", label: "Design", accent: 2 },
      { id: "build", label: "Build", accent: 3 },
    ],
    edges: [link("root", "design"), link("root", "build")],
    groups: [],
    title: null,
    caption: null,
  },
  timeline: {
    direction: "right",
    nodes: [
      { id: "discovery", label: "Discovery", note: "Q1" },
      { id: "build", label: "Build", note: "Q2", accent: 2 },
      { id: "launch", label: "Launch", note: "Q3", accent: 3 },
    ],
    edges: [],
    groups: [],
    title: null,
    caption: null,
  },
};

export function sampleDiagram(kind: DiagramKind = "flow"): DiagramAttrs {
  return structuredClone({ kind, ...SAMPLES[kind] });
}
