import { StarterKit } from "@tiptap/starter-kit";
import { TaskList, TaskItem } from "@tiptap/extension-list";
import { Details, DetailsContent, DetailsSummary } from "@tiptap/extension-details";
import { BlockMath, InlineMath } from "@tiptap/extension-mathematics";
import { Subscript } from "@tiptap/extension-subscript";
import { Superscript } from "@tiptap/extension-superscript";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TextStyle, Color } from "@tiptap/extension-text-style";
import { Highlight } from "@tiptap/extension-highlight";
import { TextAlign } from "@tiptap/extension-text-align";
import { Callout } from "./callout";
import { Badge } from "./badge";
import { CardGrid, Card } from "./cards";
import { ColumnList, Column } from "./columns";
import { StatRow, Stat } from "./stats";
import { Timeline, TimelineItem } from "./timeline";
import { StepList, Step } from "./steps";
import { Pyramid, PyramidTier } from "./pyramid";
import { DocCover, CoverLine } from "./cover";
import { PageBreak } from "./page-break";
import { Chart } from "./chart";
import { Diagram } from "./diagram";
import { HighlightedCodeBlock } from "./code-block";
import { DocImage } from "./doc-image";
import { TableOfContents } from "./toc";

/**
 * What a Docyfier document is made of, declared once.
 *
 * Two places need this list: the editor, which renders it, and the headless
 * schema, which validates AI output against it. They used to hold a copy each,
 * and a node added to one but not the other made every answer containing it
 * fail validation — a rule with two homes.
 *
 * Nothing here may import React: the schema is built server-side.
 */
export const DOCUMENT_EXTENSIONS = [
  // Link ships in StarterKit v3; inside the editor a click must place the
  // caret, not navigate away from the document being written.
  // The code block comes from `code-block.ts` instead: same node name, same
  // shape, plus the language it is written in.
  StarterKit.configure({ link: { openOnClick: false }, codeBlock: false }),
  Callout,
  TaskList,
  TaskItem.configure({ nested: true }),
  Details.configure({ persist: true }),
  DetailsSummary,
  DetailsContent,
  Table.configure({ resizable: true }),
  TableRow,
  TableHeader,
  TableCell,
  TextStyle,
  Color,
  Highlight.configure({ multicolor: true }),
  Badge,
  Subscript,
  Superscript,
  InlineMath,
  BlockMath,
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
  DocCover,
  CoverLine,
  PageBreak,
  TextAlign.configure({ types: ["heading", "paragraph"] }),
];

/**
 * The nodes the editor draws with a React view. They are declared here like any
 * other, so the schema always has them; the editor swaps in the `.extend()`ed
 * version from the `View` component that draws it, which carries the same node
 * shape by construction. A node that gains a view — or loses one — changes
 * nothing here.
 */
export const VIEWED_NODES = [Chart, Diagram, DocImage, TableOfContents, HighlightedCodeBlock];
