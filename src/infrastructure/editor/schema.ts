import "server-only";
import { getSchema, type JSONContent } from "@tiptap/core";
import { Node as PMNode } from "@tiptap/pm/model";
import { StarterKit } from "@tiptap/starter-kit";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TextStyle, Color } from "@tiptap/extension-text-style";
import { Highlight } from "@tiptap/extension-highlight";
import { Callout } from "@/infrastructure/editor/callout";
import { Badge } from "@/infrastructure/editor/badge";
import { CardGrid, Card } from "@/infrastructure/editor/cards";
import { ColumnList, Column } from "@/infrastructure/editor/columns";
import { StatRow, Stat } from "@/infrastructure/editor/stats";
import { Timeline, TimelineItem } from "@/infrastructure/editor/timeline";
import { StepList, Step } from "@/infrastructure/editor/steps";
import { Pyramid, PyramidTier } from "@/infrastructure/editor/pyramid";
import { Chart } from "@/infrastructure/editor/chart";
import { DocCover, CoverLine } from "@/infrastructure/editor/cover";
import { TableOfContents } from "@/infrastructure/editor/toc";
import { PageBreak } from "@/infrastructure/editor/page-break";
import { DocImage } from "@/infrastructure/editor/doc-image";
import { TextAlign } from "@tiptap/extension-text-align";
import { chartError } from "@/domain/documents/chart";

/**
 * Headless ProseMirror schema mirroring the editor's extensions
 * (src/components/Editor.tsx). Every piece of AI output is validated against
 * it server-side before it is ever injected into the editor — invalid JSON
 * triggers a retry, never a broken document.
 */
export const editorSchema = getSchema([
  StarterKit,
  Callout,
  Table,
  TableRow,
  TableHeader,
  TableCell,
  TextStyle,
  Color,
  Highlight.configure({ multicolor: true }),
  Badge,
  CardGrid,
  Card,
  ColumnList,
  Column,
  StatRow,
  Stat,
  Timeline,
  TimelineItem,
  StepList,
  Step,
  Pyramid,
  PyramidTier,
  Chart,
  DocCover,
  CoverLine,
  TableOfContents,
  PageBreak,
  DocImage,
  TextAlign.configure({ types: ["heading", "paragraph"] }),
]);

/** Throws with a descriptive message when `json` is not a valid document. */
export function validateDocJson(json: unknown): JSONContent {
  if (typeof json !== "object" || json === null) {
    throw new Error("Output is not a JSON object");
  }
  if ((json as { type?: unknown }).type !== "doc") {
    throw new Error('Root node must be {"type": "doc", ...}');
  }
  const node = PMNode.fromJSON(editorSchema, json);
  node.check();
  // ProseMirror only checks node/mark shape; chart attrs carry their own rules
  // (series/category lengths, numeric values) that must fail loudly here so the
  // AI retry loop can fix them instead of persisting an unrenderable block.
  node.descendants((child) => {
    if (child.type.name !== "chart") return true;
    const error = chartError(child.attrs);
    if (error) throw new Error(error);
    return false;
  });
  return json as JSONContent;
}
