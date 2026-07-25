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

/**
 * Headless ProseMirror schema mirroring the editor's extensions
 * (src/components/Editor.tsx). Every piece of AI output is validated against
 * it server-side before it is ever injected into the editor — invalid JSON
 * triggers a retry, never a broken document.
 */
const schema = getSchema([
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
]);

/** Throws with a descriptive message when `json` is not a valid document. */
export function validateDocJson(json: unknown): JSONContent {
  if (typeof json !== "object" || json === null) {
    throw new Error("Output is not a JSON object");
  }
  if ((json as { type?: unknown }).type !== "doc") {
    throw new Error('Root node must be {"type": "doc", ...}');
  }
  const node = PMNode.fromJSON(schema, json);
  node.check();
  return json as JSONContent;
}
