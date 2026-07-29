import type { AnyExtension } from "@tiptap/core";
import { Placeholder } from "@tiptap/extension-placeholder";
import { Typography } from "@tiptap/extension-typography";
import { CharacterCount } from "@tiptap/extensions";
import { AiDiff } from "@/infrastructure/editor/ai-diff";
import { Search } from "@/infrastructure/editor/search";
import {
  DOCUMENT_EXTENSIONS,
  VIEWED_NODES,
} from "@/infrastructure/editor/document-extensions";
import { ChartNode } from "../chart/ChartView";
import { DiagramNode } from "../diagram/DiagramView";
import { CodeBlockNode } from "./CodeBlockView";
import { ImageNode } from "../ImageView";
import { EmbedNode } from "../EmbedView";
import { AttachmentNode } from "../AttachmentView";
import { TocNode } from "../TocView";
import { EmojiCommand } from "./emoji-command";
import { GhostText } from "./ghost-text";
import { Shortcuts } from "./shortcuts";
import { SlashCommand } from "./slash-command";
import { UploadNotes } from "./upload-notes";

/**
 * Everything the editor loads: the document's own nodes and marks, and the
 * extensions that only exist while someone is typing — the slash menu, the AI
 * review markers, the search highlights, the placeholder.
 *
 * What a document is made of is declared once, in
 * `src/infrastructure/editor/document-extensions.ts`, and shared with the
 * server-side schema that validates AI output. Here a node is only ever
 * *upgraded* with the React view that draws it; one with no view still loads,
 * so the editor can never understand fewer node types than the schema.
 */
const VIEWS: Record<string, AnyExtension> = {
  [ChartNode.name]: ChartNode,
  [DiagramNode.name]: DiagramNode,
  [ImageNode.name]: ImageNode,
  [EmbedNode.name]: EmbedNode,
  [AttachmentNode.name]: AttachmentNode,
  [TocNode.name]: TocNode,
  [CodeBlockNode.name]: CodeBlockNode,
};

/** What the instance's writing style decides about typing itself. */
export interface TypingPreferences {
  /** Quotes, dashes and ellipses take their typographic form as they are typed. */
  readonly smartTypography: boolean;
  /** Emoji are welcome, so `:` offers them. */
  readonly emoji: boolean;
}

export function editorExtensions({ smartTypography, emoji }: TypingPreferences) {
  return [
    ...DOCUMENT_EXTENSIONS,
    ...VIEWED_NODES.map((node) => VIEWS[node.name] ?? node),
    SlashCommand,
    Shortcuts,
    AiDiff,
    Search,
    UploadNotes,
    GhostText,
    CharacterCount,
    ...(smartTypography ? [Typography] : []),
    // Emoji off is a rule about this instance's writing, not only about what
    // the model sends: the picker does not exist either.
    ...(emoji ? [EmojiCommand] : []),
    Placeholder.configure({
      placeholder: "Write your document, or press the toolbar to add structure…",
    }),
  ];
}
