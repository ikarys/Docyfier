import type { BlockAction } from "./contract";

/** Saying the same thing again — better, shorter, or at greater length. */

export const rewrite: BlockAction = {
  id: "rewrite",
  label: "Rewrite",
  family: "rewrite",
  instruction:
    "Rewrite this block so it reads better: clearer, more direct, no filler. Keep every fact it carries, keep its language, and keep it the same kind of block.",
};

export const shorten: BlockAction = {
  id: "shorten",
  label: "Shorten",
  family: "rewrite",
  instruction:
    "Shorten this block. Keep every fact it carries and its language; cut the words that carry none. Keep it the same kind of block.",
};

export const expand: BlockAction = {
  id: "expand",
  label: "Expand",
  family: "rewrite",
  instruction:
    "Develop this block: add the detail, the example or the consequence a reader would ask for next. Keep its language and its register, and do not invent figures.",
};
