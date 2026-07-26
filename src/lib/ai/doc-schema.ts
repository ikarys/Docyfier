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
import { Callout } from "@/components/extensions/Callout";
import { Badge } from "@/components/extensions/Badge";
import { CardGrid, Card } from "@/components/extensions/Cards";
import { ColumnList, Column } from "@/components/extensions/Columns";
import { StatRow, Stat } from "@/components/extensions/Stats";
import { Timeline, TimelineItem } from "@/components/extensions/Timeline";
import { StepList, Step } from "@/components/extensions/Steps";
import { Pyramid, PyramidTier } from "@/components/extensions/Pyramid";
import { Chart } from "@/components/extensions/Chart";
import { DocCover, CoverLine } from "@/components/extensions/Cover";
import { TableOfContents } from "@/components/extensions/Toc";
import { PageBreak } from "@/components/extensions/PageBreak";
import { DocImage } from "@/components/extensions/DocImage";
import { TextAlign } from "@tiptap/extension-text-align";
import { chartError } from "@/lib/doc/chart";

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
