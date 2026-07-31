import { marked, text, type RoundTripCase } from "./nodes";

/** Every mark the editor ships, plus the characters the format has to escape. */
export const MARK_CASES: RoundTripCase[] = [
  { name: "bold", blocks: [{ type: "paragraph", content: [marked("gras", { type: "bold" })] }] },
  {
    name: "italic",
    blocks: [{ type: "paragraph", content: [marked("italique", { type: "italic" })] }],
  },
  { name: "strike", blocks: [{ type: "paragraph", content: [marked("barré", { type: "strike" })] }] },
  {
    name: "underline",
    blocks: [{ type: "paragraph", content: [marked("souligné", { type: "underline" })] }],
  },
  {
    name: "code",
    blocks: [{ type: "paragraph", content: [marked("npm run dev", { type: "code" })] }],
  },
  {
    name: "subscript",
    blocks: [{ type: "paragraph", content: [marked("2", { type: "subscript" })] }],
  },
  {
    name: "superscript",
    blocks: [{ type: "paragraph", content: [marked("e", { type: "superscript" })] }],
  },
  {
    name: "link",
    blocks: [
      {
        type: "paragraph",
        content: [marked("Docyfier", { type: "link", attrs: { href: "https://example.org/a" } })],
      },
    ],
  },
  {
    name: "colour",
    blocks: [
      {
        type: "paragraph",
        content: [marked("rouge", { type: "textStyle", attrs: { color: "#e11d48" } })],
      },
    ],
  },
  {
    name: "highlight",
    blocks: [
      {
        type: "paragraph",
        content: [marked("surligné", { type: "highlight", attrs: { color: "#fef08a" } })],
      },
    ],
  },
  { name: "badge", blocks: [{ type: "paragraph", content: [marked("Terminé", { type: "badge" })] }] },
  {
    name: "several marks on one run",
    blocks: [
      {
        type: "paragraph",
        content: [
          marked("tout à la fois", { type: "bold" }, { type: "italic" }, { type: "strike" }),
        ],
      },
    ],
  },
  {
    name: "characters the format has to escape",
    blocks: [{ type: "paragraph", content: [text("a * b _ c [d] `e` \\f ::: g # h")] }],
  },
];
