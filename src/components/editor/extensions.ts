import { StarterKit } from "@tiptap/starter-kit";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { Placeholder } from "@tiptap/extension-placeholder";
import { TextStyle, Color } from "@tiptap/extension-text-style";
import { Highlight } from "@tiptap/extension-highlight";
import { TextAlign } from "@tiptap/extension-text-align";
import { Callout } from "../extensions/Callout";
import { Badge } from "../extensions/Badge";
import { CardGrid, Card } from "../extensions/Cards";
import { ColumnList, Column } from "../extensions/Columns";
import { StatRow, Stat } from "../extensions/Stats";
import { Timeline, TimelineItem } from "../extensions/Timeline";
import { StepList, Step } from "../extensions/Steps";
import { Pyramid, PyramidTier } from "../extensions/Pyramid";
import { DocCover, CoverLine } from "../extensions/Cover";
import { PageBreak } from "../extensions/PageBreak";
import { SlashCommand } from "../extensions/SlashCommand";
import { AiDiff } from "../extensions/AiDiff";
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
