import { heading, para, text, type RoundTripCase } from "./nodes";

/** The blocks markdown already has a syntax for — the writer's whole vocabulary. */
export const PROSE_CASES: RoundTripCase[] = [
  {
    name: "paragraph with a hard break, maths and an alignment",
    blocks: [
      {
        type: "paragraph",
        attrs: { textAlign: "center" },
        content: [
          text("Une ligne"),
          { type: "hardBreak" },
          text("et la suite, avec "),
          { type: "inlineMath", attrs: { latex: "e^{i\\pi}+1=0" } },
        ],
      },
    ],
  },
  {
    name: "headings of every level",
    blocks: [heading(1, "Un"), heading(3, "Trois"), heading(6, "Six")],
  },
  {
    name: "blockquote holding two blocks",
    blocks: [{ type: "blockquote", content: [para("Cité"), para("Encore")] }],
  },
  {
    name: "bullet list with a nested list",
    blocks: [
      {
        type: "bulletList",
        content: [
          { type: "listItem", content: [para("Premier")] },
          {
            type: "listItem",
            content: [
              para("Second"),
              {
                type: "bulletList",
                content: [{ type: "listItem", content: [para("Imbriqué")] }],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: "ordered list that does not start at one",
    blocks: [
      {
        type: "orderedList",
        attrs: { start: 3 },
        content: [
          { type: "listItem", content: [para("Trois")] },
          { type: "listItem", content: [para("Quatre")] },
        ],
      },
    ],
  },
  {
    name: "checklist with a ticked item",
    blocks: [
      {
        type: "taskList",
        content: [
          { type: "taskItem", attrs: { checked: true }, content: [para("Fait")] },
          { type: "taskItem", attrs: { checked: false }, content: [para("À faire")] },
        ],
      },
    ],
  },
  {
    name: "open collapsible section",
    blocks: [
      {
        type: "details",
        attrs: { open: true },
        content: [
          { type: "detailsSummary", content: [text("Détails")] },
          { type: "detailsContent", content: [para("Le contenu replié")] },
        ],
      },
    ],
  },
  {
    name: "table with a header row, an alignment and a span",
    blocks: [
      {
        type: "table",
        content: [
          {
            type: "tableRow",
            content: [
              { type: "tableHeader", attrs: { align: "center" }, content: [para("Trimestre")] },
              { type: "tableHeader", content: [para("Revenu")] },
            ],
          },
          {
            type: "tableRow",
            content: [{ type: "tableCell", attrs: { colspan: 2 }, content: [para("Total annuel")] }],
          },
        ],
      },
    ],
  },
  {
    name: "code block naming its language",
    blocks: [
      {
        type: "codeBlock",
        attrs: { language: "typescript" },
        content: [text("const a = 1;\n\nconst b = 2;")],
      },
    ],
  },
  { name: "horizontal rule", blocks: [{ type: "horizontalRule" }] },
  { name: "block maths", blocks: [{ type: "blockMath", attrs: { latex: "\\sum_{i=1}^{n} i" } }] },
];
