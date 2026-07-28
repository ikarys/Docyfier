import type { AnyExtension } from "@tiptap/core";
import { Placeholder } from "@tiptap/extension-placeholder";
import { AiDiff } from "@/infrastructure/editor/ai-diff";
import { Search } from "@/infrastructure/editor/search";
import {
  DOCUMENT_EXTENSIONS,
  VIEWED_NODES,
} from "@/infrastructure/editor/document-extensions";
import { ChartNode } from "../chart/ChartView";
import { ImageNode } from "../ImageView";
import { TocNode } from "../TocView";
import { SlashCommand } from "./slash-command";

/**
 * Everything the editor loads: the document's own nodes and marks, and the
 * extensions that only exist while someone is typing — the slash menu, the AI
 * review markers, the placeholder.
 *
 * What a document is made of is declared once, in
 * `src/infrastructure/editor/document-extensions.ts`, and shared with the
 * server-side schema that validates AI output. Here a node is only ever
 * *upgraded* with the React view that draws it; one with no view still loads,
 * so the editor can never understand fewer node types than the schema.
 */
const VIEWS: Record<string, AnyExtension> = {
  [ChartNode.name]: ChartNode,
  [ImageNode.name]: ImageNode,
  [TocNode.name]: TocNode,
};

export const EDITOR_EXTENSIONS = [
  ...DOCUMENT_EXTENSIONS,
  ...VIEWED_NODES.map((node) => VIEWS[node.name] ?? node),
  SlashCommand,
  AiDiff,
  Search,
  Placeholder.configure({
    placeholder: "Write your document, or press the toolbar to add structure…",
  }),
];
