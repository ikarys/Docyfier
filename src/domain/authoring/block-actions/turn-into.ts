import type { BlockAction } from "./contract";

/**
 * Saying the same thing in another shape. Each of these names the block it
 * must produce, because "make it visual" is how a paragraph comes back a
 * slightly different paragraph.
 */

export const intoTable: BlockAction = {
  id: "into-table",
  label: "Turn into a table",
  family: "turn-into",
  instruction:
    "Turn this block into a table with a header row. Every value it states becomes a cell; invent no row and no column the text does not support. Keep its language.",
};

export const intoSteps: BlockAction = {
  id: "into-steps",
  label: "Turn into steps",
  family: "turn-into",
  instruction:
    "Turn this block into a stepList, one step per action it describes, each with a short title and a line of detail. Keep its language and add no step it does not describe.",
};

export const intoStats: BlockAction = {
  id: "into-stats",
  label: "Turn into key figures",
  family: "turn-into",
  instruction:
    "Turn this block into a statRow of the figures it states — the value, what it measures, and its change when the text gives one. Use only figures the text states. Keep its language.",
};

export const intoChart: BlockAction = {
  id: "into-chart",
  label: "Turn into a chart",
  family: "turn-into",
  instruction:
    "Turn this block into a chart of the figures it states, with the categories and series the text gives and a title. Use only figures the text states; if it states none, leave the block as it is.",
};
