import { Node, mergeAttributes } from "@tiptap/core";
import type { DiagramAttrs, DiagramKind } from "@/domain/documents/diagram/diagram";
import { sampleDiagram } from "@/domain/documents/diagram/sample";
import { parseJsonAttr } from "./json-attr";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    diagram: {
      insertDiagram: (kind?: DiagramKind) => ReturnType;
    };
  }
}

/**
 * Flow, architecture, sequence, hierarchy and timeline diagrams (PLAN.md STEP 10).
 *
 * An atom, like `chart`: the graph lives entirely in attrs and there is no
 * editable child content to keep in sync with the drawing. Where the boxes land
 * is never stored — `src/domain/documents/diagram/layout/` computes it — so a
 * saved document holds meaning and comes out placed the same way everywhere.
 *
 * Schema only, no node view, so the server-only validation schema can import it
 * without pulling React in. The editor loads `DiagramNode` from
 * `src/components/diagram/DiagramView.tsx`, which adds the rendering.
 */
export const Diagram = Node.create({
  name: "diagram",
  group: "block",
  atom: true,
  isolating: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    const defaults = sampleDiagram();
    return {
      kind: {
        default: defaults.kind,
        parseHTML: (el) => el.getAttribute("data-kind") ?? defaults.kind,
        renderHTML: (attrs) => ({ "data-kind": attrs.kind }),
      },
      direction: {
        default: defaults.direction,
        parseHTML: (el) => el.getAttribute("data-direction") ?? defaults.direction,
        renderHTML: (attrs) => ({ "data-direction": attrs.direction }),
      },
      nodes: {
        default: defaults.nodes,
        parseHTML: (el) => parseJsonAttr(el, "data-nodes", defaults.nodes),
        renderHTML: (attrs) => ({ "data-nodes": JSON.stringify(attrs.nodes) }),
      },
      edges: {
        default: defaults.edges,
        parseHTML: (el) => parseJsonAttr(el, "data-edges", defaults.edges),
        renderHTML: (attrs) => ({ "data-edges": JSON.stringify(attrs.edges) }),
      },
      groups: {
        default: defaults.groups,
        parseHTML: (el) => parseJsonAttr(el, "data-groups", defaults.groups),
        renderHTML: (attrs) => ({ "data-groups": JSON.stringify(attrs.groups) }),
      },
      title: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-title"),
        renderHTML: (attrs) => (attrs.title ? { "data-title": attrs.title } : {}),
      },
      caption: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-caption"),
        renderHTML: (attrs) => (attrs.caption ? { "data-caption": attrs.caption } : {}),
      },
    };
  },

  parseHTML() {
    return [{ tag: "figure[data-diagram]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["figure", mergeAttributes(HTMLAttributes, { "data-diagram": "", class: "diagram" })];
  },

  addCommands() {
    return {
      insertDiagram:
        (kind = "flow") =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: sampleDiagram(kind) satisfies DiagramAttrs,
          }),
    };
  },
});
