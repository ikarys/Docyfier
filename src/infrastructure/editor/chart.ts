import { Node, mergeAttributes } from "@tiptap/core";
import { sampleChart, type ChartAttrs, type ChartKind } from "@/domain/documents/chart";
import { parseJsonAttr } from "./json-attr";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    chart: {
      insertChart: (kind?: ChartKind) => ReturnType;
    };
  }
}

/**
 * Bar / line chart (PLAN.md STEP U6).
 *
 * An atom: the data lives entirely in attrs, so there is no editable child
 * content to keep in sync with the drawing. Rendering is inline SVG in a React
 * node view — no chart library, and printable by construction.
 *
 * Shape and bounds of the data are defined once in `src/domain/documents/chart.ts` and
 * enforced server-side by `src/infrastructure/editor/schema.ts`.
 *
 * Schema only — no node view here, so the server-only validation schema can
 * import it without pulling React in. The editor uses `ChartNode` from
 * `src/components/chart/ChartView.tsx`, which adds the rendering.
 */
export const Chart = Node.create({
  name: "chart",
  group: "block",
  atom: true,
  isolating: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    const defaults = sampleChart();
    return {
      kind: {
        default: defaults.kind,
        parseHTML: (el) => el.getAttribute("data-kind") ?? defaults.kind,
        renderHTML: (attrs) => ({ "data-kind": attrs.kind }),
      },
      categories: {
        default: defaults.categories,
        parseHTML: (el) => parseJsonAttr(el, "data-categories", defaults.categories),
        renderHTML: (attrs) => ({
          "data-categories": JSON.stringify(attrs.categories),
        }),
      },
      series: {
        default: defaults.series,
        parseHTML: (el) => parseJsonAttr(el, "data-series", defaults.series),
        renderHTML: (attrs) => ({ "data-series": JSON.stringify(attrs.series) }),
      },
      title: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-title"),
        renderHTML: (attrs) =>
          attrs.title ? { "data-title": attrs.title } : {},
      },
      caption: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-caption"),
        renderHTML: (attrs) =>
          attrs.caption ? { "data-caption": attrs.caption } : {},
      },
      showGrid: {
        default: true,
        parseHTML: (el) => el.getAttribute("data-grid") !== "false",
        renderHTML: (attrs) => ({ "data-grid": String(attrs.showGrid) }),
      },
      showLegend: {
        default: true,
        parseHTML: (el) => el.getAttribute("data-legend") !== "false",
        renderHTML: (attrs) => ({ "data-legend": String(attrs.showLegend) }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "figure[data-chart]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "figure",
      mergeAttributes(HTMLAttributes, { "data-chart": "", class: "chart" }),
    ];
  },

  addCommands() {
    return {
      insertChart:
        (kind = "bar") =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: sampleChart(kind) satisfies ChartAttrs,
          }),
    };
  },
});
