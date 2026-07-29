import type { SlashItem } from "./contract";

/** What a writer types into: headings, lists, quotes, code, tables, callouts. */
export const TEXT_ITEMS: SlashItem[] = [
  {
    title: "Heading 1",
    icon: "H1",
    keywords: ["heading", "title", "titre", "h1"],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setNode("heading", { level: 1 }).run(),
  },
  {
    title: "Heading 2",
    icon: "H2",
    keywords: ["heading", "subtitle", "titre", "sous-titre", "h2"],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setNode("heading", { level: 2 }).run(),
  },
  {
    title: "Heading 3",
    icon: "H3",
    keywords: ["heading", "titre", "h3"],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setNode("heading", { level: 3 }).run(),
  },
  {
    title: "Bullet list",
    icon: "•",
    keywords: ["list", "bullet", "liste", "puces"],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleBulletList().run(),
  },
  {
    title: "Numbered list",
    icon: "1.",
    keywords: ["list", "numbered", "ordered", "liste", "numerotee", "ordonnee"],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
  },
  {
    title: "Checklist",
    icon: "☑",
    keywords: ["task", "todo", "checkbox", "tache", "case", "checklist"],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleTaskList().run(),
  },
  {
    title: "Math block",
    icon: "∑",
    keywords: ["math", "latex", "formula", "equation", "formule", "maths"],
    command: ({ editor, range }) =>
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertBlockMath({ latex: "e = mc^2" })
        .run(),
  },
  {
    title: "Collapsible section",
    icon: "▸",
    keywords: ["details", "toggle", "fold", "repliable", "accordeon", "section"],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setDetails().run(),
  },
  {
    title: "Quote",
    icon: "❝",
    keywords: ["quote", "blockquote", "citation"],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleBlockquote().run(),
  },
  {
    title: "Code block",
    icon: "</>",
    keywords: ["code", "codeblock", "bloc de code"],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run(),
  },
  {
    title: "Table",
    icon: "▦",
    keywords: ["table", "grid", "tableau", "grille"],
    command: ({ editor, range }) =>
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
        .run(),
  },
  {
    title: "Callout: Note",
    icon: "▍",
    keywords: ["callout", "note", "encart", "remarque"],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleCallout("note").run(),
  },
  {
    title: "Callout: Tip",
    icon: "▍",
    keywords: ["callout", "tip", "astuce", "conseil"],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleCallout("tip").run(),
  },
  {
    title: "Callout: Warning",
    icon: "▍",
    keywords: ["callout", "warn", "warning", "attention", "avertissement"],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleCallout("warn").run(),
  },
  {
    title: "Callout: Danger",
    icon: "▍",
    keywords: ["callout", "danger", "risk", "risque"],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleCallout("danger").run(),
  },
];
