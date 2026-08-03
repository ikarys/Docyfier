"use client";

import {
  DIAGRAM_KINDS,
  MAX_NODES,
  type DiagramAttrs,
  type DiagramKind,
} from "@/domain/documents/diagram/diagram";
import {
  addNode,
  flipDirection,
  hasHandPlaces,
  realign,
  setCaption,
  setKind,
  setTitle,
} from "@/domain/documents/diagram/diagram-edits";

const KIND_LABELS: Record<DiagramKind, string> = {
  flow: "Flow",
  architecture: "Architecture",
  sequence: "Sequence",
  hierarchy: "Hierarchy",
  timeline: "Phase axis",
};

/**
 * What the diagram is, which way it runs, the texts around it, and its way
 * to grow — everything with no home on the boxes and arrows themselves.
 *
 * Keyboard and mouse events are stopped here: without that, ProseMirror
 * treats typing in these inputs as document input and steals the selection.
 */
export function DiagramOptions({
  attrs,
  update,
}: {
  attrs: DiagramAttrs;
  update: (attrs: Partial<DiagramAttrs>) => void;
}) {
  return (
    <div
      className="diagram-panel no-print"
      contentEditable={false}
      onKeyDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="diagram-panel-row">
        <select
          className="tb-select"
          value={attrs.kind}
          onChange={(e) => update(setKind(attrs, e.target.value as DiagramKind))}
          title="Diagram type"
        >
          {DIAGRAM_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {KIND_LABELS[kind]}
            </option>
          ))}
        </select>
        <button
          className="tb-btn"
          onClick={() => update(flipDirection(attrs))}
          title="Turn the drawing a quarter turn"
          disabled={attrs.kind === "sequence"}
        >
          {attrs.direction === "down" ? "↓ Down" : "→ Across"}
        </button>
        <button
          className="tb-btn"
          onClick={() => update(addNode(attrs))}
          disabled={attrs.nodes.length >= MAX_NODES}
          title="Add a box"
        >
          + Box
        </button>
        {/*
          The way out of a drawing pulled into a mess, and the reason a box may be
          dragged at all: shown only once a hand has placed something, because a
          diagram the layout still owns has nothing to give back.
        */}
        {hasHandPlaces(attrs) && (
          <button
            className="tb-btn"
            onClick={() => update(realign(attrs))}
            title="Give every box back to the layout"
          >
            Realign
          </button>
        )}
        <input
          className="diagram-input"
          placeholder="Title"
          value={attrs.title ?? ""}
          onChange={(e) => update(setTitle(attrs, e.target.value))}
        />
        <input
          className="diagram-input"
          placeholder="Caption"
          value={attrs.caption ?? ""}
          onChange={(e) => update(setCaption(attrs, e.target.value))}
        />
      </div>
    </div>
  );
}
