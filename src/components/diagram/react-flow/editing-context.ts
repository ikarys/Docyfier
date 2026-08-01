"use client";

import { createContext, useCallback, useContext, useState } from "react";
import type { DiagramAttrs } from "@/domain/documents/diagram/diagram";
import { commitLabel, type EditingTarget } from "./label-editing";

/**
 * Which piece of text is open for editing, shared with the nodes that draw it.
 *
 * Through a context rather than through each node's data: React Flow hands a
 * node its data and nothing else, and functions stuffed in there would be
 * rebuilt on every render of the drawing. Only one thing is ever open, so one
 * value at the top is the whole state.
 */

export interface LabelEditing {
  editing: EditingTarget | null;
  open: (target: EditingTarget) => void;
  close: () => void;
  commit: (text: string) => void;
}

const EditingContext = createContext<LabelEditing | null>(null);

export const EditingProvider = EditingContext.Provider;

export function useEditing(): LabelEditing {
  const editing = useContext(EditingContext);
  if (!editing) throw new Error("a diagram label was drawn outside the editing surface");
  return editing;
}

export function useLabelEditing(
  attrs: DiagramAttrs,
  update: (attrs: Partial<DiagramAttrs>) => void,
): LabelEditing {
  const [editing, setEditing] = useState<EditingTarget | null>(null);
  const close = useCallback(() => setEditing(null), []);

  const commit = useCallback(
    (text: string) => {
      setEditing(null);
      if (!editing) return;
      const next = commitLabel(attrs, editing, text);
      if (next) update(next);
    },
    [attrs, editing, update],
  );

  return { editing, open: setEditing, close, commit };
}

/** Whether these two name the same piece of text. */
export function isSameTarget(a: EditingTarget | null, b: EditingTarget): boolean {
  if (!a || a.of !== b.of) return false;
  return a.of === "wire" && b.of === "wire" ? a.index === b.index : "id" in a && "id" in b && a.id === b.id;
}
