"use client";

import {
  MAX_CATEGORIES,
  MAX_SERIES,
  MIN_CATEGORIES,
  type ChartAttrs,
} from "@/domain/documents/chart";
import {
  addCategory,
  addSeries,
  removeCategory,
  removeSeries,
} from "@/domain/documents/chart-edits";
import { ChartDataGrid } from "./ChartDataGrid";
import { ChartOptions } from "./ChartOptions";

/**
 * The editor shown while the block is selected: what the chart is, its data,
 * and how much of it there is.
 *
 * Every edit goes through `chart-edits`, which owns what a chart may become;
 * these components only say which edit a control triggers.
 *
 * Keyboard and mouse events are stopped here: without that, ProseMirror treats
 * typing in these inputs as document input and steals the selection.
 */
export function ChartPanel({
  attrs,
  update,
}: {
  attrs: ChartAttrs;
  update: (attrs: Partial<ChartAttrs>) => void;
}) {
  const { categories, series } = attrs;

  return (
    <div
      className="chart-panel no-print"
      contentEditable={false}
      onKeyDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <ChartOptions attrs={attrs} update={update} />
      <ChartDataGrid attrs={attrs} update={update} />

      <div className="chart-panel-row">
        <button
          className="tb-btn"
          onClick={() => update(addCategory(attrs))}
          disabled={categories.length >= MAX_CATEGORIES}
        >
          + Category
        </button>
        <button
          className="tb-btn"
          onClick={() => update(removeCategory(attrs))}
          disabled={categories.length <= MIN_CATEGORIES}
        >
          − Category
        </button>
        <button
          className="tb-btn"
          onClick={() => update(addSeries(attrs))}
          disabled={series.length >= MAX_SERIES}
        >
          + Series
        </button>
        <button
          className="tb-btn"
          onClick={() => update(removeSeries(attrs))}
          disabled={series.length <= 1}
        >
          − Series
        </button>
      </div>
    </div>
  );
}
