"use client";

import {
  MAX_SERIES,
  axisFor,
  formatTick,
  type ChartAttrs,
} from "@/domain/documents/chart";

/** SVG user-space geometry. The viewBox scales; these are not screen pixels. */
const W = 720;
const H = 300;
const PAD = { top: 14, right: 14, bottom: 36, left: 48 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

/** Where a value and a category land in the plot, for one set of attributes. */
function scales({ categories, series }: ChartAttrs) {
  const axis = axisFor(series);
  const span = axis.max - axis.min || 1;
  const band = PLOT_W / categories.length;
  return {
    axis,
    band,
    y: (value: number) => PAD.top + ((axis.max - value) / span) * PLOT_H,
    centerX: (i: number) => PAD.left + (i + 0.5) * band,
  };
}

type Scales = ReturnType<typeof scales>;

export function ChartPlot({ attrs }: { attrs: ChartAttrs }) {
  const { categories, series, kind, showGrid } = attrs;
  const geometry = scales(attrs);
  const { axis, y, centerX } = geometry;

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

      {series.map((s, si) =>
        kind === "bar" ? (
          <Bars key={`s${si}`} values={s.values} index={si} of={series.length} at={geometry} />
        ) : (
          <Line key={`s${si}`} values={s.values} index={si} at={geometry} />
        ),
      )}

      {categories.map((c, i) => (
        <text key={`c${i}`} className="chart-cat" x={centerX(i)} y={H - 12}>
          {c}
        </text>
      ))}
    </svg>
  );
}

/** Bars share the band: each series takes a slice of it, side by side. */
function Bars({
  values,
  index,
  of,
  at,
}: {
  values: number[];
  index: number;
  of: number;
  at: Scales;
}) {
  const group = at.band * 0.68;
  const barW = group / of;
  return (
    <g data-series={index % MAX_SERIES}>
      {values.map((v, i) => (
        <rect
          key={i}
          className="chart-bar"
          x={at.centerX(i) - group / 2 + index * barW}
          y={Math.min(at.y(v), at.y(0))}
          width={Math.max(barW - 2, 1)}
          height={Math.max(Math.abs(at.y(v) - at.y(0)), 1)}
          rx={2}
        />
      ))}
    </g>
  );
}

function Line({ values, index, at }: { values: number[]; index: number; at: Scales }) {
  return (
    <g data-series={index % MAX_SERIES}>
      <polyline
        className="chart-line"
        points={values.map((v, i) => `${at.centerX(i)},${at.y(v)}`).join(" ")}
      />
      {values.map((v, i) => (
        <circle key={i} className="chart-dot" cx={at.centerX(i)} cy={at.y(v)} r={4} />
      ))}
    </g>
  );
}
