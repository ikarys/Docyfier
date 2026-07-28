"use client";

import type { ReactNode } from "react";
import { PopoverMenu } from "./PopoverMenu";

/**
 * The overflow of a toolbar: everything that is not the one action the surface
 * is for. Deliberately dumb — items arrive already rendered, so a link stays a
 * link and a server action stays a server action inside it.
 */
export function OverflowMenu({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <PopoverMenu label={label} trigger="⋯" triggerClassName="btn btn-icon">
      {children}
    </PopoverMenu>
  );
}
