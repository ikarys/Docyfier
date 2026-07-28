import type { Editor, Range } from "@tiptap/core";
import { imageFilesOf, insertUploadedImages } from "@/components/editor/image-upload";

export interface SlashItem {
  title: string;
  icon: string;
  /** English + French keywords for fuzzy matching, lowercase. */
  keywords: string[];
  command: (opts: { editor: Editor; range: Range }) => void;
}

/**
 * Every block insertable from the slash menu — parity with the old toolbar's
 * block-insert buttons (see PLAN.md STEP U1). Table row/column edits stay in
 * a contextual popup, not here.
 */
export const SLASH_ITEMS: SlashItem[] = [
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
  {
    title: "Bar chart",
    icon: "▊",
    keywords: ["chart", "bar", "graph", "graphique", "barres", "histogramme"],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).insertChart("bar").run(),
  },
  {
    title: "Line chart",
    icon: "📈",
    keywords: ["chart", "line", "trend", "graphique", "courbe", "ligne", "tendance"],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).insertChart("line").run(),
  },
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
    title: "Image",
    icon: "🖼",
    keywords: ["image", "picture", "photo", "illustration"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      pickImage(editor);
    },
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

/** Open the OS file picker and insert whatever image comes back. */
function pickImage(editor: Editor): void {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.onchange = () => {
    const files = imageFilesOf(input.files);
    if (files.length > 0) {
      void insertUploadedImages(editor.view, files, editor.state.selection.from);
    }
  };
  input.click();
}

export function filterSlashItems(query: string): SlashItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return SLASH_ITEMS;
  return SLASH_ITEMS.filter(
    (item) =>
      item.title.toLowerCase().includes(q) || item.keywords.some((k) => k.includes(q)),
  );
}
