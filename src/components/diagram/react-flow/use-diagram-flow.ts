"use client";

import { useEdgesState, useNodesState, type Connection, type Edge, type Node } from "@xyflow/react";
import { useCallback, useEffect, useMemo } from "react";
import type { DiagramAttrs } from "@/domain/documents/diagram/diagram";
import { addEdge, moveNode } from "@/domain/documents/diagram/diagram-edits";
import { placeNodes } from "@/domain/documents/diagram/layout/place";
import { boxIdOf, toFlow } from "./placement-to-flow";

/**
 * What the canvas does, kept out of what the canvas renders.
 *
 * Two sources of truth would be one too many: the diagram is the block's
 * attributes, and the library's own node list is a copy it needs to animate a
 * drag. So the copy is rebuilt from the placement whenever the block changes,
 * and a gesture commits through the edits the domain declares — nothing else
 * here writes to the document.
 */
export function useDiagramFlow(
  attrs: DiagramAttrs,
  update: (attrs: Partial<DiagramAttrs>) => void,
) {
  const model = useMemo(() => toFlow(placeNodes(attrs), attrs.direction), [attrs]);
  const [nodes, setNodes, onNodesChange] = useNodesState(model.nodes as unknown as Node[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState(model.edges as unknown as Edge[]);

  useEffect(() => {
    setNodes(model.nodes as unknown as Node[]);
    setEdges(model.edges as unknown as Edge[]);
  }, [model, setNodes, setEdges]);

  const onNodeDragStop = useCallback(
    (_: unknown, node: Node) => {
      const id = boxIdOf(node.id);
      if (id) update(moveNode(attrs, id, node.position.x, node.position.y));
    },
    [attrs, update],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      const from = boxIdOf(connection.source);
      const to = boxIdOf(connection.target);
      if (from && to) update(addEdge(attrs, from, to));
    },
    [attrs, update],
  );

  return { nodes, edges, onNodesChange, onEdgesChange, onNodeDragStop, onConnect };
}
