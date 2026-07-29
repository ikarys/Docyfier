import type { SlashItem } from "./contract";

/** The containers that arrange other blocks on the page. */
export const LAYOUT_ITEMS: SlashItem[] = [
  {
    title: "Cards",
    icon: "▤",
    keywords: ["cards", "grid", "cartes", "grille"],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).insertCardGrid(3).run(),
  },
  {
    title: "Columns",
    icon: "◫",
    keywords: ["columns", "colonnes"],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).insertColumns(2).run(),
  },
  {
    title: "Key figures",
    icon: "№",
    keywords: ["stats", "figures", "numbers", "statistiques", "chiffres"],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).insertStatRow(3).run(),
  },
  {
    title: "Timeline",
    icon: "┋",
    keywords: ["timeline", "roadmap", "chronologie", "feuille de route"],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).insertTimeline(3).run(),
  },
  {
    title: "Steps",
    icon: "➊",
    keywords: ["steps", "process", "etapes", "processus"],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).insertSteps(3).run(),
  },
  {
    title: "Pyramid",
    icon: "▲",
    keywords: ["pyramid", "hierarchy", "pyramide", "hierarchie"],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).insertPyramid(3).run(),
  },
];

/** What belongs to the document as a printed object rather than to its text. */
export const PAGE_ITEMS: SlashItem[] = [
  {
    title: "Cover",
    icon: "▤",
    keywords: ["cover", "title", "couverture", "titre", "header"],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).insertCover().run(),
  },
  {
    title: "Table of contents",
    icon: "☰",
    keywords: ["toc", "contents", "sommaire", "table des matieres", "plan"],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).insertTableOfContents().run(),
  },
  {
    title: "Page break",
    icon: "⤓",
    keywords: ["page", "break", "saut de page", "pagination"],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setPageBreak().run(),
  },
  {
    title: "Divider",
    icon: "—",
    keywords: ["divider", "hr", "rule", "separateur", "ligne"],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
  },
];
