/**
 * Chart data model, validation and axis geometry (PLAN.md STEP U6).
 *
 * Isomorphic on purpose: the editor node view uses it to render, and
 * `src/infrastructure/editor/schema.ts` uses it to reject malformed AI output
 * before it ever reaches the document — so it stays free of React and of
 * `server-only`, like everything else in this layer.
 */

export const CHART_KINDS = ["bar", "line"] as const;
export type ChartKind = (typeof CHART_KINDS)[number];

export interface ChartSeries {
  label: string;
  values: number[];
}

export interface ChartAttrs {
  kind: ChartKind;
  categories: string[];
  series: ChartSeries[];
  title: string | null;
  caption: string | null;
  showGrid: boolean;
  showLegend: boolean;
}

export const MAX_SERIES = 4;
export const MIN_CATEGORIES = 2;
export const MAX_CATEGORIES = 24;

/**
 * Describe why `value` is not usable chart data, or null when it is.
 *
 * Returning a message rather than throwing lets the schema validator fold it
 * into the AI retry loop and lets the node view show a readable placeholder
 * instead of crashing the editor.
 */
export function chartError(value: unknown): string | null {
  if (typeof value !== "object" || value === null) return "chart attrs missing";
  const a = value as Partial<ChartAttrs>;

  if (!CHART_KINDS.includes(a.kind as ChartKind)) {
    return `chart "kind" must be one of ${CHART_KINDS.join(", ")}`;
  }
  if (!Array.isArray(a.categories)) return 'chart "categories" must be an array';
  if (!a.categories.every((c) => typeof c === "string")) {
    return 'chart "categories" must all be strings';
  }
  if (a.categories.length < MIN_CATEGORIES || a.categories.length > MAX_CATEGORIES) {
    return `chart needs ${MIN_CATEGORIES}-${MAX_CATEGORIES} categories, got ${a.categories.length}`;
  }
  if (!Array.isArray(a.series)) return 'chart "series" must be an array';
  if (a.series.length < 1 || a.series.length > MAX_SERIES) {
    return `chart needs 1-${MAX_SERIES} series, got ${a.series.length}`;
  }
  for (const [i, s] of a.series.entries()) {
    if (typeof s !== "object" || s === null) return `chart series #${i + 1} is not an object`;
    if (typeof s.label !== "string") return `chart series #${i + 1} needs a string "label"`;
    if (!Array.isArray(s.values)) return `chart series #${i + 1} needs a "values" array`;
    if (s.values.length !== a.categories.length) {
      return `chart series "${s.label}" has ${s.values.length} values but there are ${a.categories.length} categories`;
    }
    if (!s.values.every((v) => typeof v === "number" && Number.isFinite(v))) {
      return `chart series "${s.label}" contains a non-numeric value`;
    }
  }
  return null;
}

export function isChartAttrs(value: unknown): value is ChartAttrs {
  return chartError(value) === null;
}

/** Placeholder data for a freshly inserted chart. */
export function sampleChart(kind: ChartKind = "bar"): ChartAttrs {
  return {
    kind,
    categories: ["Q1", "Q2", "Q3", "Q4"],
    series: [{ label: "Series 1", values: [12, 19, 15, 24] }],
    title: null,
    caption: null,
    showGrid: true,
    showLegend: true,
  };
}

export interface Axis {
  min: number;
  max: number;
  ticks: number[];
}

/** Round `raw` up to 1, 2, 2.5 or 5 × a power of ten — the steps that read well. */
function niceStep(raw: number): number {
  const power = Math.pow(10, Math.floor(Math.log10(raw)));
  const scaled = raw / power;
  const step = scaled <= 1 ? 1 : scaled <= 2 ? 2 : scaled <= 2.5 ? 2.5 : scaled <= 5 ? 5 : 10;
  return step * power;
}

/**
 * A readable value axis for `series`, with about `target` intervals.
 *
 * Always includes zero: bars measured from a floating baseline exaggerate
 * differences, which is exactly the kind of chart this product should not make.
 */
export function axisFor(series: ChartSeries[], target = 4): Axis {
  const values = series.flatMap((s) => s.values);
  const rawMin = Math.min(0, ...values);
  const rawMax = Math.max(0, ...values);
  if (rawMin === rawMax) return { min: 0, max: 1, ticks: [0, 1] };

  const step = niceStep((rawMax - rawMin) / target);
  const min = Math.floor(rawMin / step) * step;
  const max = Math.ceil(rawMax / step) * step;
  const ticks: number[] = [];
  // Guard against a pathological step; the loop must always terminate.
  for (let v = min, i = 0; v <= max + step / 1000 && i < 64; v += step, i++) {
    ticks.push(Number(v.toFixed(10)));
  }
  return { min, max, ticks };
}

/** Compact tick label: 1200 → "1.2k", 0.5 → "0.5", 42 → "42". */
export function formatTick(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${trimZero(value / 1_000_000)}M`;
  if (abs >= 1_000) return `${trimZero(value / 1_000)}k`;
  return trimZero(value);
}

function trimZero(value: number): string {
  return String(Number(value.toFixed(2)));
}
