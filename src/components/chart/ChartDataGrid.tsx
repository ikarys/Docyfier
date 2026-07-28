"use client";

import { MAX_SERIES, type ChartAttrs } from "@/domain/documents/chart";
import {
  renameCategory,
  renameSeries,
  setValue,
} from "@/domain/documents/chart-edits";

/** The numbers themselves: one column per category, one row per series. */
export function ChartDataGrid({
  attrs,
  update,
}: {
  attrs: ChartAttrs;
  update: (attrs: Partial<ChartAttrs>) => void;
}) {
  const { categories, series } = attrs;

  return (
    <div className="chart-grid-scroll">
      <table className="chart-table">
        <thead>
          <tr>
            <th />
            {categories.map((c, i) => (
              <th key={i}>
                <input
                  className="chart-input"
                  value={c}
                  onChange={(e) => update(renameCategory(attrs, i, e.target.value))}
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {series.map((s, si) => (
            <tr key={si}>
              <th>
                <span className="chart-swatch" data-series={si % MAX_SERIES} />
                <input
                  className="chart-input"
                  value={s.label}
                  onChange={(e) => update(renameSeries(attrs, si, e.target.value))}
                />
              </th>
              {s.values.map((v, i) => (
                <td key={i}>
                  <input
                    className="chart-input chart-num"
                    type="number"
                    value={v}
                    onChange={(e) => update(setValue(attrs, si, i, Number(e.target.value)))}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
