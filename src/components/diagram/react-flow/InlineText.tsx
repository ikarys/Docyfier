"use client";

import type { ReactNode } from "react";
import { isSameTarget, useEditing } from "./editing-context";
import type { EditingTarget } from "./label-editing";

/**
 * A piece of text on the drawing, rewritten where it is read.
 *
 * Double-click opens it, Enter and clicking away keep it, Escape puts the
 * original back — and putting the original back is all Escape does, because a
 * commit of unchanged text writes nothing. Every event is stopped here: without
 * that, typing would reach the editor around the diagram and Backspace would
 * ask the library to delete the box.
 */
export function InlineText({
  target,
  value,
  className,
  placeholder,
  children,
}: {
  target: EditingTarget;
  value: string;
  className: string;
  placeholder?: string;
  children?: ReactNode;
}) {
  const editing = useEditing();

  if (!isSameTarget(editing.editing, target)) {
    return (
      <span
        className={className}
        data-placeholder={value === "" ? "" : undefined}
        onDoubleClick={(e) => {
          e.stopPropagation();
          editing.open(target);
        }}
      >
        {value === "" ? placeholder : (children ?? value)}
      </span>
    );
  }

  return (
    <input
      className={`${className} diagram-inline-input nodrag nopan`}
      defaultValue={value}
      autoFocus
      onFocus={(e) => e.currentTarget.select()}
      onBlur={(e) => editing.commit(e.currentTarget.value)}
      onMouseDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") {
          e.currentTarget.value = value;
          e.currentTarget.blur();
        }
      }}
    />
  );
}
