"use client";

import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";
import type { DiagramAttrs } from "@/domain/documents/diagram/diagram";
import { diagramError } from "@/domain/documents/diagram/validation";
import { Diagram } from "@/infrastructure/editor/diagram";
import { DiagramPanel } from "./DiagramPanel";
import { DiagramPlot } from "./DiagramPlot";

/** The `diagram` node wired to its React rendering — this is what the editor loads. */
export const DiagramNode = Diagram.extend({
  addNodeView() {
    return ReactNodeViewRenderer(DiagramView);
  },
});

export function DiagramView({ node, updateAttributes, selected, editor }: NodeViewProps) {
  const attrs = node.attrs as DiagramAttrs;
  const error = diagramError(attrs);

  return (
    <NodeViewWrapper as="figure" className="diagram" data-selected={selected}>
      {attrs.title && <figcaption className="diagram-title">{attrs.title}</figcaption>}

      {error ? (
        <div className="diagram-error">This diagram cannot be drawn — {error}</div>
      ) : (
        <DiagramPlot attrs={attrs} />
      )}

      {attrs.caption && <figcaption className="diagram-caption">{attrs.caption}</figcaption>}

      {selected && editor.isEditable && (
        <DiagramPanel attrs={attrs} update={updateAttributes} />
      )}
    </NodeViewWrapper>
  );
}
