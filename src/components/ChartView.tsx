"use client";

import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";
import { Chart } from "./extensions/Chart";
import {
  CHART_KINDS,
  MAX_CATEGORIES,
  MAX_SERIES,
  MIN_CATEGORIES,
  axisFor,
  chartError,
  formatTick,
  type ChartAttrs,
  type ChartKind,
  type ChartSeries,
} from "@/lib/doc/chart";

/** SVG user-space geometry. The viewBox scales; these are not screen pixels. */
const W = 720;
const H = 300;
const PAD = { top: 14, right: 14, bottom: 36, left: 48 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

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

function ChartPlot({ attrs }: { attrs: ChartAttrs }) {
  const { categories, series, kind, showGrid } = attrs;
  const axis = axisFor(series);
  const span = axis.max - axis.min || 1;
  const y = (value: number) => PAD.top + ((axis.max - value) / span) * PLOT_H;
  const band = PLOT_W / categories.length;
  const centerX = (i: number) => PAD.left + (i + 0.5) * band;

  return (
    <svg
      className="chart-svg"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={attrs.title ?? `${kind} chart`}
      preserveAspectRatio="xMidYMid meet"
    >
      {showGrid &&
        axis.ticks.map((t) => (
          <line
            key={`g${t}`}
            className="chart-grid"
            x1={PAD.left}
            x2={PAD.left + PLOT_W}
            y1={y(t)}
            y2={y(t)}
          />
        ))}

      {axis.ticks.map((t) => (
        <text key={`t${t}`} className="chart-tick" x={PAD.left - 8} y={y(t) + 3.5}>
          {formatTick(t)}
        </text>
      ))}

      {/* Baseline sits at zero, which axisFor() always includes. */}
      <line
        className="chart-axis"
        x1={PAD.left}
        x2={PAD.left + PLOT_W}
        y1={y(0)}
        y2={y(0)}
      />

      {kind === "bar"
        ? series.map((s, si) => {
            const barW = (band * 0.68) / series.length;
            return (
              <g key={`s${si}`} data-series={si % MAX_SERIES}>
                {s.values.map((v, i) => {
                  const x = centerX(i) - (band * 0.68) / 2 + si * barW;
                  const top = Math.min(y(v), y(0));
                  return (
                    <rect
                      key={i}
                      className="chart-bar"
                      x={x}
                      y={top}
                      width={Math.max(barW - 2, 1)}
                      height={Math.max(Math.abs(y(v) - y(0)), 1)}
                      rx={2}
                    />
                  );
                })}
              </g>
            );
          })
        : series.map((s, si) => (
            <g key={`s${si}`} data-series={si % MAX_SERIES}>
              <polyline
                className="chart-line"
                points={s.values.map((v, i) => `${centerX(i)},${y(v)}`).join(" ")}
              />
              {s.values.map((v, i) => (
                <circle key={i} className="chart-dot" cx={centerX(i)} cy={y(v)} r={4} />
              ))}
            </g>
          ))}

      {categories.map((c, i) => (
        <text key={`c${i}`} className="chart-cat" x={centerX(i)} y={H - 12}>
          {c}
        </text>
      ))}
    </svg>
  );
}

type Update = (attrs: Partial<ChartAttrs>) => void;

/**
 * Typed-value editor shown while the block is selected.
 *
 * Keyboard and mouse events are stopped here: without that, ProseMirror treats
 * typing in these inputs as document input and steals the selection.
 */
function ChartPanel({ attrs, update }: { attrs: ChartAttrs; update: Update }) {
  const { categories, series } = attrs;

  const setCategory = (i: number, value: string) =>
    update({ categories: categories.map((c, j) => (j === i ? value : c)) });

  const setSeriesLabel = (si: number, label: string) =>
    update({ series: series.map((s, j) => (j === si ? { ...s, label } : s)) });

  const setValue = (si: number, i: number, raw: string) => {
    const value = Number(raw);
    if (!Number.isFinite(value)) return;
    update({
      series: series.map((s, j) =>
        j === si ? { ...s, values: s.values.map((v, k) => (k === i ? value : v)) } : s,
      ),
    });
  };

  const addCategory = () => {
    if (categories.length >= MAX_CATEGORIES) return;
    update({
      categories: [...categories, `Item ${categories.length + 1}`],
      series: series.map((s) => ({ ...s, values: [...s.values, 0] })),
    });
  };

  const removeCategory = () => {
    if (categories.length <= MIN_CATEGORIES) return;
    update({
      categories: categories.slice(0, -1),
      series: series.map((s) => ({ ...s, values: s.values.slice(0, -1) })),
    });
  };

  const addSeries = () => {
    if (series.length >= MAX_SERIES) return;
    update({
      series: [
        ...series,
        {
          label: `Series ${series.length + 1}`,
          values: categories.map(() => 0),
        } satisfies ChartSeries,
      ],
    });
  };

  const removeSeries = () => {
    if (series.length <= 1) return;
    update({ series: series.slice(0, -1) });
  };

  return (
    <div
      className="chart-panel no-print"
      contentEditable={false}
      onKeyDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
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
                    onChange={(e) => setCategory(i, e.target.value)}
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
                    onChange={(e) => setSeriesLabel(si, e.target.value)}
                  />
                </th>
                {s.values.map((v, i) => (
                  <td key={i}>
                    <input
                      className="chart-input chart-num"
                      type="number"
                      value={v}
                      onChange={(e) => setValue(si, i, e.target.value)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="chart-panel-row">
        <button className="tb-btn" onClick={addCategory} disabled={categories.length >= MAX_CATEGORIES}>
          + Category
        </button>
        <button className="tb-btn" onClick={removeCategory} disabled={categories.length <= MIN_CATEGORIES}>
          − Category
        </button>
        <button className="tb-btn" onClick={addSeries} disabled={series.length >= MAX_SERIES}>
          + Series
        </button>
        <button className="tb-btn" onClick={removeSeries} disabled={series.length <= 1}>
          − Series
        </button>
      </div>
    </div>
  );
}
