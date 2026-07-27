import { describe, expect, it } from "vitest";
import {
  MAX_CATEGORIES,
  MAX_SERIES,
  axisFor,
  chartError,
  formatTick,
  isChartAttrs,
  sampleChart,
  type ChartAttrs,
} from "./chart";

const valid: ChartAttrs = {
  kind: "bar",
  categories: ["Q1", "Q2"],
  series: [{ label: "Ventes", values: [10, 20] }],
  title: null,
  caption: null,
  showGrid: true,
  showLegend: true,
};

/**
 * `chartError` is what stands between a model's output and an unrenderable
 * block in a saved document: every message it returns feeds the AI retry loop.
 */
describe("chartError", () => {
  it("accepts well-formed attrs", () => {
    expect(chartError(valid)).toBeNull();
    expect(chartError(sampleChart())).toBeNull();
    expect(chartError(sampleChart("line"))).toBeNull();
  });

  it("rejects a non-object", () => {
    expect(chartError(null)).toBe("chart attrs missing");
    expect(chartError("bar")).toBe("chart attrs missing");
  });

  it("rejects a chart kind the renderer cannot draw", () => {
    expect(chartError({ ...valid, kind: "pie" })).toMatch(/"kind" must be one of/);
  });

  it("rejects categories that are missing, wrongly typed, too few or too many", () => {
    expect(chartError({ ...valid, categories: "Q1,Q2" })).toMatch(/must be an array/);
    expect(chartError({ ...valid, categories: ["Q1", 2] })).toMatch(/all be strings/);
    expect(chartError({ ...valid, categories: ["Q1"], series: [{ label: "a", values: [1] }] }))
      .toMatch(/needs 2-24 categories, got 1/);
    const many = Array.from({ length: MAX_CATEGORIES + 1 }, (_, i) => `c${i}`);
    expect(chartError({ ...valid, categories: many })).toMatch(/got 25/);
  });

  it("rejects no series and more series than the palette carries", () => {
    expect(chartError({ ...valid, series: [] })).toMatch(/needs 1-4 series, got 0/);
    const series = Array.from({ length: MAX_SERIES + 1 }, (_, i) => ({
      label: `s${i}`,
      values: [1, 2],
    }));
    expect(chartError({ ...valid, series })).toMatch(/got 5/);
  });

  it("names the series at fault rather than failing anonymously", () => {
    expect(chartError({ ...valid, series: [{ label: "Ventes", values: [10] }] })).toBe(
      'chart series "Ventes" has 1 values but there are 2 categories',
    );
    expect(chartError({ ...valid, series: [{ label: "Ventes", values: [10, "20"] }] }))
      .toMatch(/"Ventes" contains a non-numeric value/);
  });

  it("rejects the numbers that would break the geometry", () => {
    expect(chartError({ ...valid, series: [{ label: "a", values: [1, NaN] }] }))
      .toMatch(/non-numeric value/);
    expect(chartError({ ...valid, series: [{ label: "a", values: [1, Infinity] }] }))
      .toMatch(/non-numeric value/);
  });

  it("rejects a malformed series entry", () => {
    expect(chartError({ ...valid, series: [null] })).toMatch(/#1 is not an object/);
    expect(chartError({ ...valid, series: [{ values: [1, 2] }] })).toMatch(/needs a string "label"/);
    expect(chartError({ ...valid, series: [{ label: "a" }] })).toMatch(/needs a "values" array/);
  });
});

describe("isChartAttrs", () => {
  it("mirrors chartError as a type guard", () => {
    expect(isChartAttrs(valid)).toBe(true);
    expect(isChartAttrs({ ...valid, kind: "pie" })).toBe(false);
  });
});

/** Bars measured from a floating baseline exaggerate differences. */
describe("axisFor", () => {
  it("always includes zero", () => {
    expect(axisFor([{ label: "a", values: [100, 120] }]).min).toBe(0);
    expect(axisFor([{ label: "a", values: [-100, -120] }]).max).toBe(0);
  });

  it("rounds to steps that read well", () => {
    expect(axisFor([{ label: "a", values: [0, 10] }])).toEqual({
      min: 0,
      max: 10,
      ticks: [0, 2.5, 5, 7.5, 10],
    });
  });

  it("spans negative and positive values through zero", () => {
    expect(axisFor([{ label: "a", values: [-10, 10] }])).toEqual({
      min: -10,
      max: 10,
      ticks: [-10, -5, 0, 5, 10],
    });
  });

  it("gives a flat all-zero series an axis to draw against", () => {
    expect(axisFor([{ label: "a", values: [0, 0] }])).toEqual({
      min: 0,
      max: 1,
      ticks: [0, 1],
    });
  });

  it("reads every series, not only the first", () => {
    const axis = axisFor([
      { label: "a", values: [1, 2] },
      { label: "b", values: [90, 95] },
    ]);
    expect(axis.max).toBeGreaterThanOrEqual(95);
  });

  it("never emits an unbounded tick list", () => {
    expect(axisFor([{ label: "a", values: [0, 1e9] }]).ticks.length).toBeLessThanOrEqual(64);
  });
});

describe("formatTick", () => {
  it("keeps small numbers as they are", () => {
    expect(formatTick(0)).toBe("0");
    expect(formatTick(42)).toBe("42");
    expect(formatTick(0.5)).toBe("0.5");
  });

  it("abbreviates thousands and millions", () => {
    expect(formatTick(1200)).toBe("1.2k");
    expect(formatTick(1_000)).toBe("1k");
    expect(formatTick(2_500_000)).toBe("2.5M");
  });

  it("abbreviates negatives the same way", () => {
    expect(formatTick(-1500)).toBe("-1.5k");
  });

  it("does not leave a trailing zero", () => {
    expect(formatTick(3_000)).toBe("3k");
  });
});
