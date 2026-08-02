"use client";

import { useEdgesState, useNodesState, type Connection, type Edge, type Node } from "@xyflow/react";
import { useCallback, useEffect, useMemo, type KeyboardEvent } from "react";
import type { DiagramAttrs } from "@/domain/documents/diagram/diagram";
import { addEdge, moveNode, removeNode } from "@/domain/documents/diagram/diagram-edits";
import { placeNodes } from "@/domain/documents/diagram/layout/place";
import { removesBox } from "./box-toolbar";
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
  const model = useMemo(() => toFlow(placeNodes(attrs), attrs.direction, attrs.kind), [attrs]);
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

  /**
   * Delete removes the selected box from the document, not from the copy.
   *
   * The library's own delete key is off (`deleteKeyCode`): it would take the
   * box out of its node list and leave the diagram holding it, so the box would
   * come back the next time anything else was edited.
   */
  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      if (!removesBox(event.key)) return;
      const id = boxIdOf(nodes.find((node) => node.selected)?.id ?? "");
      if (!id) return;
      event.preventDefault();
      update(removeNode(attrs, id));
    },
    [attrs, nodes, update],
  );

  return { nodes, edges, onNodesChange, onEdgesChange, onNodeDragStop, onConnect, onKeyDown };
}
