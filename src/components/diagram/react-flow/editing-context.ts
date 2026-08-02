"use client";

import { createContext, useCallback, useContext, useState } from "react";
import type { DiagramAttrs } from "@/domain/documents/diagram/diagram";
import { commitLabel, type EditingTarget } from "./label-editing";

/**
 * The diagram and what may be done to it, shared with the nodes that draw it.
 *
 * Through a context rather than through each node's data: React Flow hands a
 * node its data and nothing else, and the diagram stuffed in there would be
 * copied onto every box on every render. Only one piece of text is ever open,
 * so one value at the top is the whole editing state.
 */

export interface DiagramEditing {
  attrs: DiagramAttrs;
  update: (attrs: Partial<DiagramAttrs>) => void;
  editing: EditingTarget | null;
  open: (target: EditingTarget) => void;
  close: () => void;
  commit: (text: string) => void;
}

const EditingContext = createContext<DiagramEditing | null>(null);

export const EditingProvider = EditingContext.Provider;

export function useEditing(): DiagramEditing {
  const editing = useContext(EditingContext);
  if (!editing) throw new Error("a diagram label was drawn outside the editing surface");
  return editing;
}

export function useDiagramEditing(
  attrs: DiagramAttrs,
  update: (attrs: Partial<DiagramAttrs>) => void,
): DiagramEditing {
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

  return { attrs, update, editing, open: setEditing, close, commit };
}

/** Whether these two name the same piece of text. */
export function isSameTarget(a: EditingTarget | null, b: EditingTarget): boolean {
  if (!a || a.of !== b.of) return false;
  return a.of === "wire" && b.of === "wire" ? a.index === b.index : "id" in a && "id" in b && a.id === b.id;
}
