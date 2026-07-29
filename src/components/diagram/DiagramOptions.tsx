"use client";

import {
  DIAGRAM_KINDS,
  type DiagramAttrs,
  type DiagramKind,
} from "@/domain/documents/diagram/diagram";
import {
  flipDirection,
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

/** What the diagram is, which way it runs, and the texts around it. */
export function DiagramOptions({
  attrs,
  update,
}: {
  attrs: DiagramAttrs;
  update: (attrs: Partial<DiagramAttrs>) => void;
}) {
  return (
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
  );
}
