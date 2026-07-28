"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * A button that opens a small panel under itself, and the one behaviour every
 * such panel owes: it closes on Escape, on a click outside, and on choosing
 * something. Toolbar menus and the document overflow are the same object with
 * different triggers, so they are one component.
 */
export function PopoverMenu({
  label,
  trigger,
  triggerClassName = "btn",
  className = "",
  children,
}: {
  /** Accessible name of the trigger. */
  label: string;
  /** What the trigger shows. */
  trigger: ReactNode;
  triggerClassName?: string;
  className?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const dismiss = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", dismiss);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", dismiss);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className={`popover ${className}`.trim()} ref={root}>
      <button
        type="button"
        className={open ? `${triggerClassName} is-active` : triggerClassName}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        title={label}
        onClick={() => setOpen((wasOpen) => !wasOpen)}
      >
        {trigger}
      </button>
      {/* Choosing an item is always the end of the menu, whatever it does. */}
      {open && (
        <div className="popover-panel" role="menu" onClick={() => setOpen(false)}>
          {children}
        </div>
      )}
    </div>
  );
}
