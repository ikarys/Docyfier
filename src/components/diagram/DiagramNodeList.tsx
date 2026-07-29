"use client";

import { ACCENT_SLOTS, type DiagramAttrs } from "@/domain/documents/diagram/diagram";
import {
  moveToGroup,
  removeNode,
  renameNode,
  setAccent,
  setNote,
} from "@/domain/documents/diagram/diagram-edits";

/** One row per box: what it says, what colour it wears, where it belongs. */
export function DiagramNodeList({
  attrs,
  update,
}: {
  attrs: DiagramAttrs;
  update: (attrs: Partial<DiagramAttrs>) => void;
}) {
  return (
    <ul className="diagram-rows">
      {attrs.nodes.map((node) => (
        <li key={node.id} className="diagram-panel-row">
          <input
            className="diagram-input"
            value={node.label}
            onChange={(e) => update(renameNode(attrs, node.id, e.target.value))}
            aria-label={`Label of ${node.label}`}
          />
          <input
            className="diagram-input"
            placeholder="Note"
            value={node.note ?? ""}
            onChange={(e) => update(setNote(attrs, node.id, e.target.value))}
            aria-label={`Note of ${node.label}`}
          />
          <select
            className="tb-select"
            value={node.accent ?? ""}
            onChange={(e) =>
              update(setAccent(attrs, node.id, e.target.value === "" ? null : Number(e.target.value)))
            }
            aria-label={`Colour of ${node.label}`}
          >
            <option value="">Plain</option>
            {Array.from({ length: ACCENT_SLOTS }, (_, i) => i + 1).map((slot) => (
              <option key={slot} value={slot}>
                Colour {slot}
              </option>
            ))}
          </select>
          {attrs.groups.length > 0 && (
            <select
              className="tb-select"
              value={node.group ?? ""}
              onChange={(e) =>
                update(moveToGroup(attrs, node.id, e.target.value === "" ? null : e.target.value))
              }
              aria-label={`Group of ${node.label}`}
            >
              <option value="">No group</option>
              {attrs.groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.label}
                </option>
              ))}
            </select>
          )}
          <button
            className="tb-btn"
            onClick={() => update(removeNode(attrs, node.id))}
            disabled={attrs.nodes.length <= 1}
            title="Remove this box and mend what ran through it"
          >
            −
          </button>
        </li>
      ))}
    </ul>
  );
}
