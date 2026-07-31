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
    "Turn this block into a table with a header row. Every value it states becomes a cell; invent no row and no column the text does not support, and state no figure it does not state. Keep its language.",
};

export const intoSteps: BlockAction = {
  id: "into-steps",
  label: "Turn into steps",
  family: "turn-into",
  instruction:
    "Turn this block into a stepList, one step per action it describes, each with a short title and a line of detail. If it is a drawing made of text — numbered lines inside a box drawn with |, -, + or ┌ — read the drawing and take one step per numbered line. Keep its language, add no step it does not describe, and write no figure it does not state — do not count the steps in a title.",
};

export const intoStats: BlockAction = {
  id: "into-stats",
  label: "Turn into key figures",
  family: "turn-into",
  instruction:
    "Turn this block into a statRow of the figures it states — the value, what it measures, and its change when the text gives one. Use only figures the text states; if it states none, leave the block as it is rather than counting what it lists. Keep its language.",
};

export const intoChart: BlockAction = {
  id: "into-chart",
  label: "Turn into a chart",
  family: "turn-into",
  instruction:
    "Turn this block into a chart of the figures it states, with the categories and series the text gives and a title. Use only figures the text states; if it states none, leave the block as it is.",
};

/**
 * The one conversion whose source is usually not prose.
 *
 * A text drawing is a diagram someone had no better way to write: the boxes,
 * the nesting and the arrows already say what a `diagram` declares. It is
 * spelled out because a model handed a code block reads it as code — the
 * characters were always there, but nobody said they were a picture.
 */
export const intoDiagram: BlockAction = {
  id: "into-diagram",
  label: "Turn into a diagram",
  family: "turn-into",
  instruction:
    "Turn this block into a diagram. If it is a drawing made of text — boxes drawn with |, -, +, ┌, └ or ─, arrows drawn with ->, -->, |, v or ▼ — read the drawing rather than its characters: one node per box, its label the text inside it, one edge per arrow between two boxes, and a group for a box that contains other boxes. Choose the kind it already is: \"architecture\" for named parts of a system, usually nested; \"flow\" for a process; \"sequence\" for messages exchanged in order; \"hierarchy\" for a tree; \"timeline\" for phases with no arrows. Every label comes from the block; invent no node and no relation it does not show, and keep its language. Write no figure the drawing does not contain — do not count its boxes, its environments or its policies, and put no total in a title or a caption.",
};
