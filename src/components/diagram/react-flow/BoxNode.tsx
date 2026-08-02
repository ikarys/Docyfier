"use client";

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { BoxToolbar } from "./BoxToolbar";
import { InlineText } from "./InlineText";
import { boxIdOf, type BoxData } from "./placement-to-flow";

/**
 * A box, in HTML rather than in SVG.
 *
 * Its size and place come from the placement, so it stands exactly where the
 * exported drawing puts it; what it paints comes from the same theme tokens the
 * SVG reads, so a document that changes theme changes this too. The handles are
 * on the axis the diagram flows along — an arrow drawn by dragging one leaves
 * and lands where the layout would have made it leave and land.
 *
 * The label and the note are edited in place. A box with no note offers one
 * while it is selected: an empty line nobody can see is a feature nobody finds.
 * Selecting it also raises the bar that holds its colour and its deletion.
 */
export function BoxNode({ id, data: box, selected }: NodeProps<Node<BoxData, "box">>) {
  const node = boxIdOf(id) ?? id;
  const along = box.direction === "down";

  return (
    <div className="diagram-box" data-accent={box.accent ?? undefined} data-selected={selected}>
      {selected && <BoxToolbar flowId={id} />}
      <Handle type="target" position={along ? Position.Top : Position.Left} />

      <InlineText
        target={{ of: "label", id: node }}
        value={box.label}
        className="diagram-box-label"
      >
        {box.lines.map((line, i) => (
          <span key={i}>{line}</span>
        ))}
      </InlineText>

      {(box.note || (selected && box.roomForNote)) && (
        <InlineText
          target={{ of: "note", id: node }}
          value={box.note ?? ""}
          className="diagram-box-note"
          placeholder="Note"
        />
      )}

      <Handle type="source" position={along ? Position.Bottom : Position.Right} />
    </div>
  );
}
