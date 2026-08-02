"use client";

import { ReactFlow } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { DiagramAttrs } from "@/domain/documents/diagram/diagram";
import { placeNodes } from "@/domain/documents/diagram/layout/place";
import { BandNode } from "./BandNode";
import { BoxNode } from "./BoxNode";
import { EditingProvider, useDiagramEditing } from "./editing-context";
import { useDiagramFlow } from "./use-diagram-flow";
import { WireEdge } from "./WireEdge";

/**
 * The drawing, editable, mounted only while the block is selected.
 *
 * Reading a document must not be dragging one, and the picture that gets
 * printed and exported stays the SVG next door — this is a surface laid over
 * the same placement for as long as someone is working on it.
 *
 * Panning and zooming are off on purpose: the drawing sits in a text column at
 * the size the layout gave it, and a diagram scrolled half out of its own frame
 * inside a page that also scrolls is nobody's idea of editing.
 */

const NODE_TYPES = { box: BoxNode, band: BandNode };
const EDGE_TYPES = { wire: WireEdge };

export function DiagramCanvas({
  attrs,
  update,
}: {
  attrs: DiagramAttrs;
  update: (attrs: Partial<DiagramAttrs>) => void;
}) {
  const placement = placeNodes(attrs);
  const flow = useDiagramFlow(attrs, update);
  const editing = useDiagramEditing(attrs, update);

  return (
    <div
      className="diagram-canvas"
      style={{ aspectRatio: `${placement.width} / ${placement.height}` }}
      contentEditable={false}
      onKeyDown={(e) => {
        e.stopPropagation();
        flow.onKeyDown(e);
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <EditingProvider value={editing}>
        <ReactFlow
          nodes={flow.nodes}
          edges={flow.edges}
          onNodesChange={flow.onNodesChange}
          onEdgesChange={flow.onEdgesChange}
          onNodeDragStop={flow.onNodeDragStop}
          onConnect={flow.onConnect}
          nodeTypes={NODE_TYPES}
          edgeTypes={EDGE_TYPES}
          fitView
          fitViewOptions={{ padding: 0 }}
          minZoom={0.1}
          maxZoom={4}
          zoomOnScroll={false}
          zoomOnPinch={false}
          zoomOnDoubleClick={false}
          panOnScroll={false}
          panOnDrag={false}
          preventScrolling={false}
          deleteKeyCode={null}
          proOptions={{ hideAttribution: true }}
        />
      </EditingProvider>
    </div>
  );
}
