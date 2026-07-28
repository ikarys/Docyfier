import {
  MAX_CATEGORIES,
  MAX_SERIES,
  MIN_CATEGORIES,
  type ChartAttrs,
  type ChartSeries,
} from "./chart";

/**
 * Every edit the chart panel can make, as a whole new set of attributes.
 *
 * The rules that keep a chart renderable live here and not in the panel: a
 * category exists for every value in every series, a chart has between one and
 * `MAX_SERIES` series, and an edit that would break either is simply not made —
 * the caller gets the chart back unchanged and the UI has nothing to check.
 */

export function renameCategory(
  attrs: ChartAttrs,
  index: number,
  label: string,
): ChartAttrs {
  return { ...attrs, categories: attrs.categories.map((c, i) => (i === index ? label : c)) };
}

export function renameSeries(
  attrs: ChartAttrs,
  index: number,
  label: string,
): ChartAttrs {
  return {
    ...attrs,
    series: attrs.series.map((s, i) => (i === index ? { ...s, label } : s)),
  };
}

/** Ignores anything that is not a finite number: a chart cannot plot NaN. */
export function setValue(
  attrs: ChartAttrs,
  seriesIndex: number,
  index: number,
  value: number,
): ChartAttrs {
  if (!Number.isFinite(value)) return attrs;
  return {
    ...attrs,
    series: attrs.series.map((s, i) =>
      i === seriesIndex
        ? { ...s, values: s.values.map((v, j) => (j === index ? value : v)) }
        : s,
    ),
  };
}

export function addCategory(attrs: ChartAttrs): ChartAttrs {
  if (attrs.categories.length >= MAX_CATEGORIES) return attrs;
  return {
    ...attrs,
    categories: [...attrs.categories, `Item ${attrs.categories.length + 1}`],
    series: attrs.series.map((s) => ({ ...s, values: [...s.values, 0] })),
  };
}

export function removeCategory(attrs: ChartAttrs): ChartAttrs {
  if (attrs.categories.length <= MIN_CATEGORIES) return attrs;
  return {
    ...attrs,
    categories: attrs.categories.slice(0, -1),
    series: attrs.series.map((s) => ({ ...s, values: s.values.slice(0, -1) })),
  };
}

export function addSeries(attrs: ChartAttrs): ChartAttrs {
  if (attrs.series.length >= MAX_SERIES) return attrs;
  const added: ChartSeries = {
    label: `Series ${attrs.series.length + 1}`,
    values: attrs.categories.map(() => 0),
  };
  return { ...attrs, series: [...attrs.series, added] };
}

export function removeSeries(attrs: ChartAttrs): ChartAttrs {
  if (attrs.series.length <= 1) return attrs;
  return { ...attrs, series: attrs.series.slice(0, -1) };
}
