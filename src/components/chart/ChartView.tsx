"use client";

import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";
import { MAX_SERIES, chartError, type ChartAttrs } from "@/domain/documents/chart";
import { Chart } from "@/infrastructure/editor/chart";
import { ChartPanel } from "./ChartPanel";
import { ChartPlot } from "./ChartPlot";

/** The `chart` node wired to its React rendering — this is what the editor loads. */
export const ChartNode = Chart.extend({
  addNodeView() {
    return ReactNodeViewRenderer(ChartView);
  },
});

export function ChartView({ node, updateAttributes, selected, editor }: NodeViewProps) {
  const attrs = node.attrs as ChartAttrs;
  const error = chartError(attrs);

  return (
    <NodeViewWrapper as="figure" className="chart" data-selected={selected}>
      {attrs.title && <figcaption className="chart-title">{attrs.title}</figcaption>}

      {error ? (
        <div className="chart-error">Chart data is invalid — {error}</div>
      ) : (
        <>
          <ChartPlot attrs={attrs} />
          {attrs.showLegend && attrs.series.length > 1 && (
            <ul className="chart-legend">
              {attrs.series.map((s, i) => (
                <li key={`${s.label}-${i}`}>
                  <span className="chart-swatch" data-series={i % MAX_SERIES} />
                  {s.label}
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {attrs.caption && <figcaption className="chart-caption">{attrs.caption}</figcaption>}

      {selected && editor.isEditable && (
        <ChartPanel attrs={attrs} update={updateAttributes} />
      )}
    </NodeViewWrapper>
  );
}
