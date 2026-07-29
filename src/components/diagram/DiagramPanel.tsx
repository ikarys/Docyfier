"use client";

import { useState } from "react";
import { MAX_NODES, type DiagramAttrs } from "@/domain/documents/diagram/diagram";
import { addEdge, addNode } from "@/domain/documents/diagram/diagram-edits";
import { DiagramEdgeList } from "./DiagramEdgeList";
import { DiagramNodeList } from "./DiagramNodeList";
import { DiagramOptions } from "./DiagramOptions";

/**
 * The editor shown while the block is selected: what the diagram is, its boxes
 * and its arrows.
 *
 * Every edit goes through `diagram-edits`, which owns what a diagram may
 * become; these components only say which edit a control triggers. Nothing here
 * moves a box — where they land is computed, so a diagram cannot be dragged
 * into a mess.
 *
 * Keyboard and mouse events are stopped here: without that, ProseMirror treats
 * typing in these inputs as document input and steals the selection.
 */
export function DiagramPanel({
  attrs,
  update,
}: {
  attrs: DiagramAttrs;
  update: (attrs: Partial<DiagramAttrs>) => void;
}) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const linkable = attrs.kind !== "timeline";

  return (
    <div
      className="diagram-panel no-print"
      contentEditable={false}
      onKeyDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <DiagramOptions attrs={attrs} update={update} />
      <DiagramNodeList attrs={attrs} update={update} />

      <div className="diagram-panel-row">
        <button
          className="tb-btn"
          onClick={() => update(addNode(attrs))}
          disabled={attrs.nodes.length >= MAX_NODES}
        >
          + Box
        </button>
      </div>

      {linkable && (
        <>
          <DiagramEdgeList attrs={attrs} update={update} />
          <div className="diagram-panel-row">
            <NodePicker attrs={attrs} value={from} onChange={setFrom} label="From" />
            <NodePicker attrs={attrs} value={to} onChange={setTo} label="To" />
            <button
              className="tb-btn"
              onClick={() => update(addEdge(attrs, from, to))}
              disabled={from === "" || to === "" || from === to}
            >
              + Arrow
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function NodePicker({
  attrs,
  value,
  onChange,
  label,
}: {
  attrs: DiagramAttrs;
  value: string;
  onChange: (id: string) => void;
  label: string;
}) {
  return (
    <select
      className="tb-select"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
    >
      <option value="">{label}…</option>
      {attrs.nodes.map((node) => (
        <option key={node.id} value={node.id}>
          {node.label}
        </option>
      ))}
    </select>
  );
}
