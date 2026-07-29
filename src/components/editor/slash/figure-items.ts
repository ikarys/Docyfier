import type { Editor } from "@tiptap/core";
import {
  filesOf,
  imageFilesOf,
  insertUploadedFiles,
  insertUploadedGallery,
} from "@/components/editor/image-upload";
import type { SlashItem } from "./contract";

type InsertFiles = (view: Editor["view"], files: File[], pos: number) => Promise<void>;

/** Open the OS file picker on pictures only, and insert what comes back. */
function pickImages(editor: Editor, insert: InsertFiles): void {
  pick(editor, "image/*", imageFilesOf, insert);
}

/** The same, on anything this instance accepts. */
function pickAnyFile(editor: Editor, insert: InsertFiles): void {
  pick(editor, "", filesOf, insert);
}

function pick(
  editor: Editor,
  accept: string,
  chosen: (list: FileList | null) => File[],
  insert: InsertFiles,
): void {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = accept;
  input.multiple = true;
  input.onchange = () => {
    const files = chosen(input.files);
    if (files.length > 0) void insert(editor.view, files, editor.state.selection.from);
  };
  input.click();
}

/**
 * Ask for the page to embed. Only the providers the domain allows can answer,
 * so a URL nobody frames is refused where it was typed rather than inserted as
 * a block that renders nothing.
 */
function promptForEmbed(editor: Editor): void {
  const url = window.prompt("Page to embed (YouTube, Vimeo, Loom, Figma)");
  if (url === null || url.trim() === "") return;
  if (!editor.chain().focus().insertEmbed(url.trim()).run()) {
    window.alert("Nothing here can be embedded from that address.");
  }
}

/** Everything the reader looks at rather than reads: charts, diagrams, pictures. */
export const FIGURE_ITEMS: SlashItem[] = [
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
    title: "Flow diagram",
    icon: "⤵",
    keywords: ["diagram", "flow", "process", "schema", "diagramme", "flux", "processus"],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).insertDiagram("flow").run(),
  },
  {
    title: "Architecture diagram",
    icon: "▥",
    keywords: ["diagram", "architecture", "system", "schema", "systeme", "composants"],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).insertDiagram("architecture").run(),
  },
  {
    title: "Sequence diagram",
    icon: "⇄",
    keywords: ["diagram", "sequence", "messages", "echanges", "acteurs"],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).insertDiagram("sequence").run(),
  },
  {
    title: "Hierarchy diagram",
    icon: "⑂",
    keywords: ["diagram", "hierarchy", "tree", "org", "hierarchie", "arbre", "organigramme"],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).insertDiagram("hierarchy").run(),
  },
  {
    // The `timeline` block is a list of moments; this one is an axis with
    // phases strung along it. Keywords are kept apart so the two never compete.
    title: "Phase axis",
    icon: "⟶",
    keywords: ["diagram", "axis", "phases", "milestones", "axe", "jalons", "etapes cles"],
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).insertDiagram("timeline").run(),
  },
  {
    title: "Image",
    icon: "🖼",
    keywords: ["image", "picture", "photo", "illustration"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      pickImages(editor, insertUploadedFiles);
    },
  },
  {
    title: "File attachment",
    icon: "⇩",
    keywords: ["file", "attachment", "pdf", "document", "fichier", "piece jointe"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      pickAnyFile(editor, insertUploadedFiles);
    },
  },
  {
    title: "Embed",
    icon: "▶",
    keywords: ["embed", "video", "youtube", "vimeo", "loom", "figma", "integration"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      promptForEmbed(editor);
    },
  },
  {
    title: "Gallery",
    icon: "🖼🖼",
    keywords: ["gallery", "images", "row", "galerie", "photos", "mosaique"],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      pickImages(editor, insertUploadedGallery);
    },
  },
];
