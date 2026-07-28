import { StarterKit } from "@tiptap/starter-kit";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { Placeholder } from "@tiptap/extension-placeholder";
import { TextStyle, Color } from "@tiptap/extension-text-style";
import { Highlight } from "@tiptap/extension-highlight";
import { TextAlign } from "@tiptap/extension-text-align";
import { Callout } from "@/infrastructure/editor/callout";
import { Badge } from "@/infrastructure/editor/badge";
import { CardGrid, Card } from "@/infrastructure/editor/cards";
import { ColumnList, Column } from "@/infrastructure/editor/columns";
import { StatRow, Stat } from "@/infrastructure/editor/stats";
import { Timeline, TimelineItem } from "@/infrastructure/editor/timeline";
import { StepList, Step } from "@/infrastructure/editor/steps";
import { Pyramid, PyramidTier } from "@/infrastructure/editor/pyramid";
import { DocCover, CoverLine } from "@/infrastructure/editor/cover";
import { PageBreak } from "@/infrastructure/editor/page-break";
import { SlashCommand } from "./slash-command";
import { AiDiff } from "@/infrastructure/editor/ai-diff";
import { ChartNode } from "../ChartView";
import { ImageNode } from "../ImageView";
import { TocNode } from "../TocView";

/**
 * Every node and mark the editor understands.
 *
 * The same list is mirrored server-side by `src/lib/ai/doc-schema.ts`: a node
 * type added here that is missing there makes every AI answer containing it
 * fail validation.
 */
export const EDITOR_EXTENSIONS = [
  // Link ships in StarterKit v3; inside the editor a click must place the
  // caret, not navigate away from the document being written.
  StarterKit.configure({ link: { openOnClick: false } }),
  Callout,
  Table.configure({ resizable: true }),
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
  ChartNode,
  ImageNode,
  TocNode,
  DocCover,
  CoverLine,
  PageBreak,
  TextAlign.configure({ types: ["heading", "paragraph"] }),
  SlashCommand,
  AiDiff,
  Placeholder.configure({
    placeholder: "Write your document, or press the toolbar to add structure…",
  }),
];
