"use client";

import { CHART_KINDS, type ChartAttrs, type ChartKind } from "@/domain/documents/chart";

/** What the chart is and what it shows around the plot: type, texts, chrome. */
export function ChartOptions({
  attrs,
  update,
}: {
  attrs: ChartAttrs;
  update: (attrs: Partial<ChartAttrs>) => void;
}) {
  return (
    <div className="chart-panel-row">
      <select
        className="tb-select"
        value={attrs.kind}
        onChange={(e) => update({ kind: e.target.value as ChartKind })}
        title="Chart type"
      >
        {CHART_KINDS.map((k) => (
          <option key={k} value={k}>
            {k === "bar" ? "Bars" : "Lines"}
          </option>
        ))}
      </select>
      <input
        className="chart-input"
        placeholder="Title"
        value={attrs.title ?? ""}
        onChange={(e) => update({ title: e.target.value || null })}
      />
      <input
        className="chart-input"
        placeholder="Caption"
        value={attrs.caption ?? ""}
        onChange={(e) => update({ caption: e.target.value || null })}
      />
      <label className="chart-check">
        <input
          type="checkbox"
          checked={attrs.showGrid}
          onChange={(e) => update({ showGrid: e.target.checked })}
        />
        Grid
      </label>
      <label className="chart-check">
        <input
          type="checkbox"
          checked={attrs.showLegend}
          onChange={(e) => update({ showLegend: e.target.checked })}
        />
        Legend
      </label>
    </div>
  );
}
