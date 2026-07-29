"use client";

import { blockActionsOf } from "@/domain/authoring/block-actions/catalog";
import type { BlockAction } from "@/domain/authoring/block-actions/contract";
import { PopoverMenu } from "../PopoverMenu";

/**
 * The AI actions on the block under the drag handle (PLAN.md STEP U11). Two
 * families, drawn in catalog order: saying it again, and saying it in another
 * shape.
 */
export function BlockActionMenu({
  running,
  onPick,
}: {
  /** The action running, by id; the whole menu waits while one is. */
  running: string | null;
  onPick: (action: BlockAction) => void;
}) {
  return (
    <PopoverMenu
      label="Ask the AI about this block"
      trigger="✦"
      triggerClassName="drag-handle-btn"
      className="block-action-menu"
    >
      {(["rewrite", "turn-into"] as const).map((family) => (
        <div key={family} className="block-action-group">
          {blockActionsOf(family).map((action) => (
            <button
              key={action.id}
              type="button"
              role="menuitem"
              className="menu-row"
              disabled={running !== null}
              onClick={() => onPick(action)}
            >
              {action.label}
              {running === action.id && <span aria-hidden> …</span>}
            </button>
          ))}
        </div>
      ))}
    </PopoverMenu>
  );
}
