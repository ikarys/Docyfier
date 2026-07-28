import { describe, expect, it } from "vitest";
import {
  addCategory,
  addSeries,
  removeCategory,
  removeSeries,
  renameCategory,
  renameSeries,
  setValue,
} from "./chart-edits";
import { MAX_CATEGORIES, MAX_SERIES, MIN_CATEGORIES, sampleChart } from "./chart";
import type { ChartAttrs } from "./chart";

const chart = (categories: string[], ...series: number[][]): ChartAttrs => ({
  ...sampleChart(),
  categories,
  series: series.map((values, i) => ({ label: `Series ${i + 1}`, values })),
});

const two = () => chart(["A", "B"], [1, 2]);

describe("editing the data grid", () => {
  it("renames one category and leaves the rest alone", () => {
    expect(renameCategory(two(), 1, "Beta").categories).toEqual(["A", "Beta"]);
  });

  it("renames one series", () => {
    expect(renameSeries(two(), 0, "Revenue").series[0].label).toBe("Revenue");
  });

  it("writes one value", () => {
    expect(setValue(two(), 0, 1, 42).series[0].values).toEqual([1, 42]);
  });

  it("refuses a value that is not a finite number", () => {
    const before = two();
    expect(setValue(before, 0, 0, Number.NaN)).toEqual(before);
    expect(setValue(before, 0, 0, Number.POSITIVE_INFINITY)).toEqual(before);
  });
});

describe("growing and shrinking a chart", () => {
  it("gives every series a value when a category is added", () => {
    const grown = addCategory(chart(["A", "B"], [1, 2], [3, 4]));
    expect(grown.categories).toHaveLength(3);
    expect(grown.series.map((s) => s.values)).toEqual([
      [1, 2, 0],
      [3, 4, 0],
    ]);
  });

  it("drops the matching value from every series when a category goes", () => {
    const shrunk = removeCategory(chart(["A", "B", "C"], [1, 2, 3], [4, 5, 6]));
    expect(shrunk.categories).toEqual(["A", "B"]);
    expect(shrunk.series.map((s) => s.values)).toEqual([
      [1, 2],
      [4, 5],
    ]);
  });

  it("fills a new series with a zero per category", () => {
    const grown = addSeries(chart(["A", "B", "C"], [1, 2, 3]));
    expect(grown.series).toHaveLength(2);
    expect(grown.series[1].values).toEqual([0, 0, 0]);
  });

  it("names the blocks it adds after their position", () => {
    expect(addCategory(two()).categories[2]).toBe("Item 3");
    expect(addSeries(two()).series[1].label).toBe("Series 2");
  });

  it("removes the last series", () => {
    expect(removeSeries(addSeries(two())).series).toHaveLength(1);
  });
});

describe("the bounds a chart may not cross", () => {
  const many = (n: number) => Array.from({ length: n }, (_, i) => `C${i}`);

  it("stops adding categories at the maximum", () => {
    const full = chart(many(MAX_CATEGORIES), many(MAX_CATEGORIES).map(() => 1));
    expect(addCategory(full)).toEqual(full);
  });

  it("keeps at least the minimum number of categories", () => {
    const smallest = chart(many(MIN_CATEGORIES), many(MIN_CATEGORIES).map(() => 1));
    expect(removeCategory(smallest)).toEqual(smallest);
  });

  it("stops adding series at the maximum", () => {
    let full = two();
    while (full.series.length < MAX_SERIES) full = addSeries(full);
    expect(addSeries(full)).toEqual(full);
  });

  it("never removes the last series — a chart with no data is not a chart", () => {
    const single = two();
    expect(removeSeries(single)).toEqual(single);
  });
});
