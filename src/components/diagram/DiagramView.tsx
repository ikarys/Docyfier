"use client";

import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";
import dynamic from "next/dynamic";
import type { DiagramAttrs } from "@/domain/documents/diagram/diagram";
import { diagramError } from "@/domain/documents/diagram/validation";
import { Diagram } from "@/infrastructure/editor/diagram";
import { DiagramPanel } from "./DiagramPanel";
import { DiagramPlot } from "./DiagramPlot";

/**
 * The editing surface is fetched the first time someone selects a diagram, not
 * with the editor: it is a whole graph library, and a document nobody edits a
 * drawing in must not pay for it. Reading, printing and exporting stay the SVG.
 */
const DiagramCanvas = dynamic(
  () => import("./react-flow/DiagramCanvas").then((m) => m.DiagramCanvas),
  { ssr: false, loading: () => <div className="diagram-canvas-loading" /> },
);

/** The `diagram` node wired to its React rendering — this is what the editor loads. */
export const DiagramNode = Diagram.extend({
  addNodeView() {
    return ReactNodeViewRenderer(DiagramView);
  },
});

export function DiagramView({ node, updateAttributes, selected, editor }: NodeViewProps) {
  const attrs = node.attrs as DiagramAttrs;
  const error = diagramError(attrs);
  const editing = selected && editor.isEditable;

  return (
    <NodeViewWrapper as="figure" className="diagram" data-selected={selected}>
      {attrs.title && <figcaption className="diagram-title">{attrs.title}</figcaption>}

      {error ? (
        <div className="diagram-error">This diagram cannot be drawn — {error}</div>
      ) : editing ? (
        <DiagramCanvas attrs={attrs} update={updateAttributes} />
      ) : (
        <DiagramPlot attrs={attrs} />
      )}

      {attrs.caption && <figcaption className="diagram-caption">{attrs.caption}</figcaption>}

      {editing && <DiagramPanel attrs={attrs} update={updateAttributes} />}
    </NodeViewWrapper>
  );
}
